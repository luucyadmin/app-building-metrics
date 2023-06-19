import i18n from "./i18n";

const app = ui.createProjectPanelSection();

type Record = {
  label: string | ui.Element;
  data: any[];
  format: (value: any) => string;
};

const compareVariantsModal = new ui.Modal(i18n.Compare_Variants, ui.medium);
const showDetailsModal = new ui.Modal(i18n.View_Details, ui.medium);

const toPercentage = (value: number) => `${(100 * value).toFixed(1)} %`;

const toCsv = (rows: any[][]): string => {
  return rows.map((row) => row.join(",")).join("\n");
};

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

const onShowViewDetails = () => {
  showDetailsModal.removeAllChildren();

  const variant = data.selectedProject.selectedVariant;
  const buildings = variant.buildings;
  const columns = buildings.map((variant, index) => new ui.Column<Record>(variant.name, (item) => item.format(item.data[index])));

  const metricsRecords: Record[] = [
    { label: i18n.Volume, data: buildings.map((b) => b.volume.total), format: (value) => value.toMetricVolumeString() },
    { label: i18n.Floor_Area, data: buildings.map((b) => b.floorArea.total), format: (value) => value.toMetricAreaString() },
    { label: i18n.Area_above_ground, data: buildings.map((b) => b.floorArea.overground), format: (value) => value.toMetricAreaString() },
    { label: i18n.Area_below_ground, data: buildings.map((b) => b.floorArea.underground), format: (value) => value.toMetricAreaString() },
    { label: i18n.Footprint, data: buildings.map((b) => b.footprint), format: (value) => value.toMetricAreaString() },
  ];
  const metricsColumns = [new ui.Column<Record>(i18n.Metrics, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);
  showDetailsModal.add(metricsTable);
  
  showDetailsModal.add(new ui.Button(i18n.CSV_Export, () => exportToCsv(`${variant.name}-overview.csv`, metricsTable)));

  showDetailsModal.open();
};

const onShowCompareVariants = async () => {
  compareVariantsModal.removeAllChildren();
  compareVariantsModal.add(new ui.Label(i18n.Loading));
  compareVariantsModal.open();

  const variants = await data.selectedProject.getVariants();
  const columns = variants.map((variant, index) => new ui.Column<Record>(variant.name, (item) => item.format(item.data[index])));

  const metricsRecords: Record[] = [
    { label: i18n.Volume, data: variants.map((v) => v.totalVolume.total), format: (value) => value.toMetricVolumeString() },
    { label: i18n.Floor_Area, data: variants.map((v) => v.totalFloorArea.total), format: (value) => value.toMetricAreaString() },
    { label: i18n.Area_above_ground, data: variants.map((v) => v.totalFloorArea.overground), format: (value) => value.toMetricAreaString() },
    { label: i18n.Area_below_ground, data: variants.map((v) => v.totalFloorArea.underground), format: (value) => value.toMetricAreaString() },
    { label: i18n.Footprint, data: variants.map((v) => sum(v.buildings.map((b) => b.footprint))), format: (value) => value.toMetricAreaString() },
  ];
  const metricsColumns = [new ui.Column<Record>(i18n.Metrics, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);

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
  const usagesColumns = [new ui.Column<Record>(i18n.Usages, (item) => item.label), ...columns];
  const usagesTable = new ui.Table(usagesRecords, usagesColumns);

  const exportButton = new ui.Button(i18n.CSV_Export, () => {
    exportToCsv(`${data.selectedProject.name}-overview.csv`, metricsTable);
    exportToCsv(`${data.selectedProject.name}-usages.csv`, usagesTable);
  })
  
  compareVariantsModal.removeAllChildren();
  compareVariantsModal.add(metricsTable);
  compareVariantsModal.add(usagesTable);
  compareVariantsModal.add(exportButton);
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
  const section = new ui.Section(i18n.Selected_Variant);
  app.add(section);
  const volumeLabel = new ui.LabeledValue(i18n.Volume, "- m³");
  section.add(volumeLabel);
  const areaLabel = new ui.LabeledValue(i18n.Floor_Area, "- m²");
  section.add(areaLabel);
  const overgroundAreaLabel = new ui.LabeledValue(i18n.Area_above_ground, "- m²");
  section.add(overgroundAreaLabel);
  const undergroundAreaLabel = new ui.LabeledValue(i18n.Area_below_ground, "- m²");
  section.add(undergroundAreaLabel);
  const footprintLabel = new ui.LabeledValue(i18n.Footprint, "- m²");
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
        section.name = i18n.No_variant_selected;
        areaLabel.value = "- m²";
        volumeLabel.value = "- m³";
        overgroundAreaLabel.value = "- m²"; 
        undergroundAreaLabel.value = "- m²";
        footprintLabel.value = "- m²";
      }
    });

    app.add(new ui.Button(i18n.View_Details, onShowViewDetails));
    app.add(new ui.Button(i18n.Compare_Variants, onShowCompareVariants));
  }
});
