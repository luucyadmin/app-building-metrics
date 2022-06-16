const app = ui.createProjectPanelSection();

// create panel
const panel = new ui.Panel('Compare Variants');

data.onProjectSelect.subscribe(async project => {
    app.removeAllChildren();

    // section for active varaint information
    const section = new ui.Section('Selected Variant');
    app.add(section);

    const areaLabel = new ui.LabeledValue('Area', '- m²');
    section.add(areaLabel);

    const volumeLabel = new ui.LabeledValue('Volume', '- m³');
    section.add(volumeLabel);

    if (project) {
        // get informations of active variant 
        project.onVariantSelect.subscribe(variant => {
            if (variant) {
                section.name = variant.name;

                variant.onFloorAreaChange.subscribe(area => areaLabel.value = area.toMetricAreaString());
                variant.onVolumeChange.subscribe(volume => volumeLabel.value = volume.toMetricVolumeString());
            } else {
                section.name = 'No variant selected';

                areaLabel.value = '- m²';
                volumeLabel.value = '- m³';
            }
        });

        app.add(new ui.Button('Compare Variants', async () => {
            panel.removeAllChildren();
        
            const variants = await data.selectedProject.getVariants();

            const maxArea = Math.max(...variants.map(variant => variant.floorArea));
            const maxVolume = Math.max(...variants.map(volume => volume.volume));

            for (let variant of variants) {
                const section = new ui.Section(variant.name);
                panel.add(section);

                const areaChart = new ui.BarChart('Area', value => value.toMetricAreaString());
                areaChart.addSegment(variant.name, variant.floorArea);
                areaChart.max = maxArea;

                section.add(areaChart);

                const volumeChart = new ui.BarChart('Volume', value => value.toMetricVolumeString());
                volumeChart.addSegment(variant.name, variant.volume);
                volumeChart.max = maxVolume;

                section.add(volumeChart);
            }
        
            panel.open();
        }));
    }
});
