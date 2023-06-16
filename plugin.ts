const app = ui.createProjectPanelSection();

type Record = {
  label: string | ui.Element;
  data: any[];
  format: (value: any) => string;
};

const showDetailsText = "View Details".translate.german("Details Ansehen");
const compareVariantsText = "Compare Variants".translate.german("Varianten Vergleichen");
const volumeText = "Volume".translate.german("Gebäudevolumen");
const floorAreaText = "Floor Area".translate.german("Geschlossfläche");
const aboveGroundAreaText = "Area above ground".translate.german("Oberirdischer Fläche");
const belowGroundAreaText = "Area below ground".translate.german("Unterirdischer Fläche");
const footprintText = "Footprint".translate.german("Grundfläche");
const metricsText = "Metrics".translate.german("Kennzahlen");
const usagesText = "Usages".translate.german("Nutzung");
const noVariantSelectedText = "No variant selected".translate.german("Keine Variante ausgewählt");
const selectedVariantText = "Selected Variant".translate.german("Ausgewählte Variante");
const csvText = "CSV Export";
const formattedText = "Formatted".translate.german("Formatiert");
const rawText = "Raw".translate.german("Roh");
const downloadCsvText = "Download CSV".translate.german("CSV Herunterladen");

const compareVariantsModal = new ui.Modal(compareVariantsText, ui.small);
const showDetailsModal = new ui.Modal(showDetailsText, ui.medium);

const toPercentage = (value: number) => `${(100 * value).toFixed(1)} %`;

const toCsv = (rows: any[][]): string => {
  return rows.map((row) => row.join(",")).join("\n");
};

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

const onShowViewDetails = async () => {
  showDetailsModal.removeAllChildren();

  const variant = await data.selectedProject.selectedVariant;
  const buildings = variant.buildings;
  const columns = buildings.map((variant, index) => new ui.Column<Record>(variant.name, (item) => item.format(item.data[index])));

  const metricsRecords: Record[] = [
    { label: volumeText, data: buildings.map((b) => b.volume.total), format: (value) => value.toMetricVolumeString() },
    { label: floorAreaText, data: buildings.map((b) => b.floorArea.total), format: (value) => value.toMetricAreaString() },
    { label: aboveGroundAreaText, data: buildings.map((b) => b.floorArea.overground), format: (value) => value.toMetricAreaString() },
    { label: belowGroundAreaText, data: buildings.map((b) => b.floorArea.underground), format: (value) => value.toMetricAreaString() },
    { label: footprintText, data: buildings.map((b) => b.footprint), format: (value) => value.toMetricAreaString() },
  ];
  const metricsColumns = [new ui.Column<Record>(metricsText, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);
  showDetailsModal.add(metricsTable);
  
  showDetailsModal.add(new ui.Button(csvText, () => exportToCsv(`${variant.name}-overview.csv`, metricsTable)));

  showDetailsModal.open();
};

const onShowCompareVariants = async () => {
  compareVariantsModal.removeAllChildren();

  const variants = await data.selectedProject.getVariants();
  const columns = variants.map((variant, index) => new ui.Column<Record>(variant.name, (item) => item.format(item.data[index])));

  const metricsRecords: Record[] = [
    { label: volumeText, data: variants.map((v) => v.totalVolume.total), format: (value) => value.toMetricVolumeString() },
    { label: floorAreaText, data: variants.map((v) => v.totalFloorArea.total), format: (value) => value.toMetricAreaString() },
    { label: aboveGroundAreaText, data: variants.map((v) => v.totalFloorArea.overground), format: (value) => value.toMetricAreaString() },
    { label: belowGroundAreaText, data: variants.map((v) => v.totalFloorArea.underground), format: (value) => value.toMetricAreaString() },
    { label: footprintText, data: variants.map((v) => sum(v.buildings.map((b) => b.footprint))), format: (value) => value.toMetricAreaString() },
  ];
  const metricsColumns = [new ui.Column<Record>(metricsText, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);
  compareVariantsModal.add(metricsTable);

  const usageTypes = variants.flatMap((v) => v.usages.map((u) => u.type));
  const uniqueUsageTypes = usageTypes.filter((t, i, a) => a.indexOf(t) === i);
  const usagesRecords: Record[] = uniqueUsageTypes.map((type) => ({
    label: type,
    data: variants.map((v) => {
      const totalUsages = v.usages.reduce((acc, u) => acc + u.area, 0);
      const usage = v.usages.find((u) => u.type === type);
      return usage && totalUsages ? usage.area / totalUsages : 0;
    }),
    format: toPercentage,
  }));
  const usagesColumns = [new ui.Column<Record>(usagesText, (item) => item.label), ...columns];
  const usagesTable = new ui.Table(usagesRecords, usagesColumns);
  compareVariantsModal.add(usagesTable);
  
  compareVariantsModal.add(new ui.Button(csvText, () => {
    exportToCsv(`${data.selectedProject.name}-overview.csv`, metricsTable);
    exportToCsv(`${data.selectedProject.name}-usages.csv`, usagesTable);
  }));

  compareVariantsModal.open();
};

const exportToCsv = (filename: string, table: ui.Table<Record>) => {
  const csv = toCsv([
    table.getColumns().map((column) => column.name),
    ...table.getRecords().map((record) => [record.label, ...record.data]),
  ]);
  ui.download(File.fromString(filename, csv));
};

let variantSubscription;
let volumeSubscription;
let areaSubscription;
let buildingSubscription;
data.onProjectSelect.subscribe(async (project) => {
  app.removeAllChildren();
  // section for active variant information
  const section = new ui.Section(selectedVariantText);
  app.add(section);
  const volumeLabel = new ui.LabeledValue(volumeText, "- m³");
  section.add(volumeLabel);
  const areaLabel = new ui.LabeledValue(floorAreaText, "- m²");
  section.add(areaLabel);
  const overgroundAreaLabel = new ui.LabeledValue(aboveGroundAreaText, "- m²");
  section.add(overgroundAreaLabel);
  const undergroundAreaLabel = new ui.LabeledValue(belowGroundAreaText, "- m²");
  section.add(undergroundAreaLabel);
  const footprintLabel = new ui.LabeledValue(footprintText, "- m²");
  section.add(footprintLabel);

  const showVolume = (volume: data.Metric) => {
    volumeLabel.value = volume.total.toMetricVolumeString();
  }
  const showArea = (area: data.Metric) => {
    areaLabel.value = area.total.toMetricAreaString();
    overgroundAreaLabel.value = area.overground.toMetricAreaString();
    undergroundAreaLabel.value = area.underground.toMetricAreaString();
  }
  const showFootprint = (buildings: data.Building[]) => {
    footprintLabel.value = sum(buildings.map((b) => b.footprint)).toMetricAreaString();
  }

  variantSubscription?.unsubscribe();
  if (project) {
    // get information of active variant
    variantSubscription = project.onVariantSelect.subscribe((variant) => {
      volumeSubscription?.unsubscribe();
      areaSubscription?.unsubscribe();
      buildingSubscription?.unsubscribe();

      if (variant) {
        section.name = variant.name;        
        showVolume(variant.totalVolume);
        showArea(variant.totalFloorArea);
        showFootprint(variant.buildings);
        volumeSubscription = variant.onTotalVolumeChange.subscribe(showVolume);
        areaSubscription = variant.onTotalFloorAreaChange.subscribe(showArea);
        buildingSubscription = variant.onBuildingsChange.subscribe(showFootprint);
      } else {
        section.name = noVariantSelectedText;
        areaLabel.value = "- m²";
        volumeLabel.value = "- m³";
        overgroundAreaLabel.value = "- m²"; 
        undergroundAreaLabel.value = "- m²";
        footprintLabel.value = "- m²";
      }
    });

    app.add(new ui.Button(showDetailsText, onShowViewDetails));
    app.add(new ui.Button(compareVariantsText, onShowCompareVariants));
  }
});
