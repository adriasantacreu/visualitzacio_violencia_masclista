// stripesHeatmap.js: Conté la lògica per dibuixar el mapa de calor de ratlles i els seus filtres
import { addTooltip, tooltip, parseDate, relevantEvents, distinctPurplePalette, provinceOptions, genderOptions, orderedAgeOptions } from './utils.js';

// Global state for Stripes Heatmap filters
export let selectedStripesFilters = {
    type: 'None', // 'None', 'Província', 'Gènere', 'Franja d\'edat'
    values: new Set() // Stores selected filter values for the current type
};

export function drawStripesHeatmap(data, container, tooltipRef, parseDateRef, relevantEventsRef, distinctPurplePaletteRef, selectedStripesFiltersRef, provinceOptionsRef, genderOptionsRef, orderedAgeOptionsRef) {
    container.selectAll("*").remove(); // Neteja qualsevol SVG preexistent

    // Aplica els filtres si estan actius
    const filteredData = data.filter(d => {
        if (selectedStripesFiltersRef.type === 'None') {
            return true;
        } else {
            return selectedStripesFiltersRef.values.has(d[selectedStripesFiltersRef.type]);
        }
    });

    const margin = { top: 30, right: 20, bottom: 50, left: 50 };
    const containerWidth = parseInt(container.style("width"));
    const containerHeight = parseInt(container.style("height"));
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepara les dades setmanals: agrupa per l'inici de la setmana i compta el nombre de trucades
    const dataByWeek = d3.rollup(filteredData, // Usa les dades filtrades
        v => v.length,
        d => d3.timeWeek.floor(d.parsedDate)
    );

    // Obté el rang d'anys per a l'escala X
    const minYear = d3.min(filteredData, d => d.parsedDate.getFullYear()); // Usa les dades filtrades
    const maxYear = d3.max(filteredData, d => d.parsedDate.getFullYear());

    if (!minYear || !maxYear) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("class", "text-gray-500 text-lg")
            .text("No hi ha dades per mostrar amb els filtres actuals.");
        return;
    }

    // Escala X per als anys
    const xScaleYears = d3.scaleTime()
        .domain([new Date(minYear, 0, 1), new Date(maxYear + 1, 0, 1)]) // Domini dels anys
        .range([0, width]);

    // Escala de color per al mapa de calor (interpolació de morats/liles)
    const maxCallsPerWeek = d3.max(Array.from(dataByWeek.values()));
    const color = d3.scaleSequential(d3.interpolatePurples).domain([0, maxCallsPerWeek || 1]);

    // Dibuixa les ratlles (rectangles) per a cada setmana
    const weeks = Array.from(dataByWeek.keys()).sort((a,b) => a - b);

    svg.selectAll("rect")
        .data(weeks)
        .join("rect")
        .attr("x", d => xScaleYears(d)) // Posició X basada en la data de la setmana
        .attr("y", 0) // Posició Y fixa a la part superior del gràfic
        // Calcular l'amplada de cada ratlla dinàmicament en funció del nombre total de setmanes i l'amplada del gràfic
        .attr("width", (width / weeks.length)) 
        .attr("height", height) // Alçada total de la ratlla
        .attr("fill", d => color(dataByWeek.get(d) || 0)) // Color basat en el volum de trucades
        .call(addTooltip, d => {
            const year = d.getFullYear();
            const weekNumber = d3.timeFormat("%W")(d); // Format de número de setmana (00-53)
            const count = dataByWeek.get(d) || 0;
            return `Any: ${year}<br>Setmana: ${weekNumber}<br>Trucades: ${count}`;
        });

    // Dibuixa l'eix X (anys)
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScaleYears)
            .tickFormat(d3.timeFormat("%Y"))
            .ticks(d3.timeYear.every(1)) // Mostra un tick per cada any
        );

    // Dades d'esdeveniments importants (excloent festivitats i esdeveniments feministes)
    const importantEvents = relevantEventsRef.filter(e => e.type !== "Reivindicatiu" && e.type !== "Festivitat");

    // Afegir línies verticals per a esdeveniments importants
    svg.selectAll(".event-line")
        .data(importantEvents)
        .join("line")
        .attr("class", "event-line")
        .attr("x1", d => xScaleYears(new Date(d.date)))
        .attr("x2", d => xScaleYears(new Date(d.date)))
        .attr("y1", 0)
        .attr("y2", height);

    // Afegir etiquetes per als esdeveniments importants
    svg.selectAll(".event-label")
        .data(importantEvents)
        .join("text")
        .attr("class", "event-label")
        .attr("x", d => xScaleYears(new Date(d.date)) + 15) // Desplaçament de 15px a la dreta de la línia
        .attr("y", height / 2) // Centrat verticalment
        .attr("text-anchor", "start") // El text comença en aquesta posició
        .attr("transform", d => `rotate(-90, ${xScaleYears(new Date(d.date)) + 15}, ${height / 2})`) // Rotar -90 graus al voltant del punt d'inici del text
        .text(d => d.name);
}

// Funció per configurar els filtres de la Visualització per Setmanes
export function setupStripesFilters(loadedBaseData) {
    const filterContainer = d3.select("#stripes-filters");
    const filterTypeSelect = d3.select("#stripes-filter-type");
    const filterOptionsContainer = d3.select("#stripes-filter-options");

    filterTypeSelect.on("change", () => {
        selectedStripesFilters.type = filterTypeSelect.node().value;
        selectedStripesFilters.values.clear(); // Clear previous selections

        filterOptionsContainer.selectAll("*").remove(); // Clear previous checkboxes

        if (selectedStripesFilters.type !== 'None' && loadedBaseData) {
            let options = [];
            // Populate options based on the selected filter type
            if (selectedStripesFilters.type === 'Província') {
                options = provinceOptions;
            } else if (selectedStripesFilters.type === 'Gènere') {
                options = genderOptions;
            } else if (selectedStripesFilters.type === 'Franja d\'edat') {
                options = orderedAgeOptions;
            }

            options.forEach(option => {
                const label = filterOptionsContainer.append("label")
                    .attr("class", "inline-flex items-center mr-4 cursor-pointer");
                
                label.append("input")
                    .attr("type", "checkbox")
                    .attr("class", "form-checkbox year-checkbox") // Reuse some styling
                    .attr("value", option)
                    .property("checked", true) // Default to all selected
                    .on("change", (event) => {
                        if (event.target.checked) {
                            selectedStripesFilters.values.add(option);
                        } else {
                            selectedStripesFilters.values.delete(option);
                        }
                        drawStripesHeatmap(loadedBaseData, d3.select("#stripes-heatmap-svg-container"), tooltip, parseDate, relevantEvents, distinctPurplePalette, selectedStripesFilters, provinceOptions, genderOptions, orderedAgeOptions);
                    });
                
                label.append("span")
                    .attr("class", "ml-2 text-gray-700")
                    .text(option);
                
                selectedStripesFilters.values.add(option); // Add to selected by default
            });
        }
        drawStripesHeatmap(loadedBaseData, d3.select("#stripes-heatmap-svg-container"), tooltip, parseDate, relevantEvents, distinctPurplePalette, selectedStripesFilters, provinceOptions, genderOptions, orderedAgeOptions);
    });

    // Trigger initial change to populate filters and draw chart
    // Ensure to set the default value of the select to "None" if no filter is active
    filterTypeSelect.property("value", selectedStripesFilters.type);
    filterTypeSelect.dispatch('change'); // Manually trigger change event to populate filters
}

// Funció per dibuixar la llegenda del gràfic de ratlles (si es necessita)
export function drawStripesLegend() {
    const legendContainer = d3.select("#legend-stripes");
    legendContainer.selectAll("*").remove(); // Neteja la llegenda existent
    legendContainer.append('h3').attr('class', 'text-sm font-semibold text-gray-500 mt-4').text("Volum de Trucades");
    
    // Calcula la mida del contenidor de la llegenda per assegurar un ample correcte
    const legendContainerWidth = parseInt(legendContainer.style("width"));
    const legendWidth = legendContainerWidth - 40; // Deixa un marge per a la llegenda

    // Defineix una escala de color per a la llegenda que mostri tot el rang de d3.interpolatePurples
    const legendColorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, 100]); 

    const gradientId = "stripes-legend-gradient";
    const svgLegend = legendContainer.append("svg").attr("width", legendWidth).attr("height", 25); 
    const linearGradient = svgLegend.append("defs").append("linearGradient").attr("id", gradientId).attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", legendColorScale(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", legendColorScale(100)); 
    
    svgLegend.append("rect").attr("width", legendWidth).attr("height", 25).style("fill", `url(#${gradientId})`);

    const legendLabels = legendContainer.append("div").attr("class", "flex justify-between text-xs text-gray-600 mt-1");
    legendLabels.append("span").text("Baix");
    legendLabels.append("span").text("Alt");
}
