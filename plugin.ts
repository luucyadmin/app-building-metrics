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
const csvModal = new ui.Modal(csvText);

const toPercentage = (value: number) => `${(100 * value).toFixed(1)} %`;

const toCsv = (rows: any[][]): string => {
  return rows.map((row) => row.join(",")).join("\n");
};

const onShowViewDetails = async () => {
  showDetailsModal.removeAllChildren();

  const buildings = await data.selectedProject.selectedVariant.buildings;
  const columns = buildings.map((variant, index) => new ui.Column<Record>(variant.name, (item) => item.format(item.data[index])));

  const metricsRecords: Record[] = [
    { label: volumeText, data: buildings.map((b) => b.volume.total), format: (value) => value.toMetricVolumeString() },
    { label: floorAreaText, data: buildings.map((b) => b.floorArea.total), format: (value) => value.toMetricAreaString() },
    { label: aboveGroundAreaText, data: buildings.map((b) => b.floorArea.overground), format: (value) => value.toMetricAreaString() },
    { label: belowGroundAreaText, data: buildings.map((b) => b.floorArea.underground), format: (value) => value.toMetricAreaString() },
  ];
  const metricsColumns = [new ui.Column<Record>(metricsText, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);
  showDetailsModal.add(new ui.Button(csvText, () => onExportToCsv(metricsTable)));
  showDetailsModal.add(metricsTable);

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
  ];
  const metricsColumns = [new ui.Column<Record>(metricsText, (item) => item.label), ...columns];
  const metricsTable = new ui.Table(metricsRecords, metricsColumns);
  compareVariantsModal.add(new ui.Button(csvText, () => onExportToCsv(metricsTable)));
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
  compareVariantsModal.add(new ui.Button(csvText, () => onExportToCsv(usagesTable)));
  compareVariantsModal.add(usagesTable);

  compareVariantsModal.open();
};

const onExportToCsv = (table: ui.Table<Record>) => {
  const formattedCsv = toCsv([
    table.getColumns().map((column) => column.name),
    ...table.getRecords().map((record) => table.getColumns().map((column, idx) => column.resolve(record, idx))
    ),
  ]);
  const rawCsv = toCsv([
    table.getColumns().map((column) => column.name),
    ...table.getRecords().map((record) => [record.label, ...record.data]),
  ]);

  csvModal.removeAllChildren();
  csvModal.add(new ui.Label(formattedText));
  csvModal.add(new ui.Code(formattedCsv));
  csvModal.add(new ui.Button(downloadCsvText, () => ui.download(File.fromString("formatted.csv", formattedCsv))));

  csvModal.add(new ui.Label(rawText));
  csvModal.add(new ui.Code(rawCsv));
  csvModal.add(new ui.Button(downloadCsvText, () => ui.download(File.fromString("raw.csv", formattedCsv))));
  csvModal.open();
};

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

  if (project) {
    // get information of active variant
    project.onVariantSelect.subscribe((variant) => {
      if (variant) {
        section.name = variant.name;
        variant.onTotalVolumeChange.subscribe((volume) => (volumeLabel.value = volume.total.toMetricVolumeString()));
        variant.onTotalFloorAreaChange.subscribe((area) => {
          areaLabel.value = area.total.toMetricAreaString();
          overgroundAreaLabel.value = area.overground.toMetricAreaString();
          undergroundAreaLabel.value = area.underground.toMetricAreaString();
        });
      } else {
        section.name = noVariantSelectedText;
        areaLabel.value = "- m²";
        volumeLabel.value = "- m³";
      }
    });

    app.add(new ui.Button(showDetailsText, onShowViewDetails));
    app.add(new ui.Button(compareVariantsText, onShowCompareVariants));
  }
});
