const app = ui.createProjectPanelSection();

// create panel
const panel = new ui.Panel('Vergleichen');

data.onProjectSelect.subscribe(async project => {
    app.removeAllChildren();

    // section for active varaint information
    const section = new ui.Section('Aktive Variante');
    app.add(section);

    const areaLabel = new ui.LabeledValue('Fläche Total', '- m²');
    section.add(areaLabel);

    const volumeLabel = new ui.LabeledValue('Volume Total', '- m³');
    section.add(volumeLabel);

    if (project) {
        // get informations of active variant 
        project.onVariantSelect.subscribe(variant => {
            if (variant) {
                section.name = variant.name;

                variant.onFloorAreaChange.subscribe(area => areaLabel.value = area.toMetricAreaString());
                variant.onVolumeChange.subscribe(volume => volumeLabel.value = volume.toMetricVolumeString());
            } else {
                section.name = 'Keine Variante Ausgewählt';

                areaLabel.value = '- m²';
                volumeLabel.value = '- m³';
            }
        });

        section.add(new ui.Button('Varianten Vergleichen', async () => {
            panel.removeAllChildren();
        
            const variants = await data.selectedProject.getVariants();

            const maxArea = Math.max(...variants.map(variant => variant.floorArea));
            const maxVolume = Math.max(...variants.map(volume => volume.volume));

            for (let variant of variants) {
                const section = new ui.Section(variant.name);
                panel.add(section);

                const areaChart = new ui.BarChart('Area', 'm²');
                areaChart.addSegment(variant.name, variant.floorArea);
                areaChart.max = maxArea;

                section.add(areaChart);

                const volumeChart = new ui.BarChart('Volume', 'm³');
                volumeChart.addSegment(variant.name, variant.volume);
                volumeChart.max = maxVolume;

                section.add(volumeChart);
            }
        
            panel.open();
        }));
    }
});
