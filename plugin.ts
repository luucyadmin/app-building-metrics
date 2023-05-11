const app = ui.createProjectPanelSection();

// create panel
const panel = new ui.Panel('Compare Variants'.translate.german('Varianten Vergleichen'));

data.onProjectSelect.subscribe(async project => {
    app.removeAllChildren();

    // section for active variant information
    const section = new ui.Section('Selected Variant');
    app.add(section);

    const areaLabel = new ui.LabeledValue('Floor Area'.translate.german('Geschossfläche'), '- m²');
    section.add(areaLabel);

    const volumeLabel = new ui.LabeledValue('Volume'.translate.german('Gebäudevolumen'), '- m³');
    section.add(volumeLabel);

    if (project) {
        // get information of active variant 
        project.onVariantSelect.subscribe(variant => {
            if (variant) {
                section.name = variant.name;

                variant.onTotalFloorAreaChange.subscribe(area => areaLabel.value = area.total.toMetricAreaString());
                variant.onTotalVolumeChange.subscribe(volume => volumeLabel.value = volume.total.toMetricVolumeString());
            } else {
                section.name = 'No variant selected'.translate.german('Keine Variante ausgewählt');

                areaLabel.value = '- m²';
                volumeLabel.value = '- m³';
            }
        });

        app.add(new ui.Button('Compare Variants'.translate.german('Alle Vergleichen'), async () => {
            panel.removeAllChildren();
        
            const variants = await data.selectedProject.getVariants();

            const maxArea = Math.max(...variants.map(variant => variant.totalFloorArea.total));
            const maxVolume = Math.max(...variants.map(volume => volume.totalVolume.total));

            const areaSection = new ui.Section('Floor Area'.translate.german('Geschlossfläche'));
            panel.add(areaSection);

            const volumeSection = new ui.Section('Volume'.translate.german('Gebäudevolumen'));
            panel.add(volumeSection);

            for (let variant of variants) {
                const areaChart = new ui.BarChart(variant.name, value => value.toMetricAreaString());
                areaChart.addSegment(variant.name, variant.totalFloorArea.total);
                areaChart.max = maxArea;
                areaSection.add(areaChart);
                
                const volumeChart = new ui.BarChart(variant.name, value => value.toMetricVolumeString());
                volumeChart.addSegment(variant.name, variant.totalVolume.total);
                volumeChart.max = maxVolume;
                volumeSection.add(volumeChart);
            }
        
            panel.open();
        }));
    }
});
