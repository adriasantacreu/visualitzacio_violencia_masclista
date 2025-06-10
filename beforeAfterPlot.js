// beforeAfterPlot.js: Conté la lògica per dibuixar el gràfic de canvis abans/després i els seus filtres
import { addTooltip, tooltip, parseDate, relevantEvents, provinceOptions, genderOptions, orderedAgeOptions } from './utils.js';

// Funció per configurar els filtres del gràfic de canvis
export function setupBeforeAfterFilters(loadedBaseData) {
    const filterContainer = d3.select("#before-after-filters");
    filterContainer.selectAll("*").remove(); // Neteja els filtres existents

    if (!loadedBaseData) return;

    // Segment by dropdown
    const segmentByOptions = [
        { value: "Província", text: "Província" },
        { value: "Gènere", text: "Gènere" },
        { value: "Franja d'edat", text: "Franja d'edat" }
    ];
    const segmentBySelect = filterContainer.append("label") // Afegit label
        .attr("class", "text-sm font-semibold text-gray-700 mr-2")
        .text("Segmenta per:")
        .append("select") // Moure select dins del label
        .attr("id", "segment-by")
        .attr("class", "p-2 border rounded-md mr-4 text-sm");
    segmentBySelect.selectAll("option")
        .data(segmentByOptions)
        .join("option")
        .attr("value", d => d.value)
        .text(d => d.text);
    segmentBySelect.on("change", () => updateBeforeAfterPlot(loadedBaseData));

    // Event select dropdown
    const eventSelect = filterContainer.append("label") // Afegit label
        .attr("class", "text-sm font-semibold text-gray-700 mr-2")
        .text("Esdeveniment:")
        .append("select") // Moure select dins del label
        .attr("id", "event-select")
        .attr("class", "p-2 border rounded-md text-sm");
    eventSelect.selectAll("option")
        .data(relevantEvents)
        .join("option")
        .attr("value", d => d.date)
        .text(d => d.name);
    eventSelect.on("change", () => updateBeforeAfterPlot(loadedBaseData));

    // Custom date input
    const customDateLabel = filterContainer.append("label")
        .attr("class", "text-sm font-semibold text-gray-700 ml-4 mr-2")
        .text("Data Personalitzada:");
    const customDateInput = customDateLabel.append("input")
        .attr("type", "date")
        .attr("id", "custom-event-date")
        .attr("class", "p-2 border rounded-md text-sm");
    customDateInput.on("change", () => updateBeforeAfterPlot(loadedBaseData)); // Re-dibuixa en canviar la data

    // Window size dropdown
    const windowSizeSelect = filterContainer.append("label") // Afegit label
        .attr("class", "text-sm font-semibold text-gray-700 ml-4 mr-2")
        .text("Finestra (setmanes):")
        .append("select") // Moure select dins del label
        .attr("id", "window-size")
        .attr("class", "p-2 border rounded-md text-sm");
    windowSizeSelect.selectAll("option")
        .data([
            { value: 1, text: "1 setmana" },
            { value: 2, text: "2 setmanes" }
        ])
        .join("option")
        .attr("value", d => d.value)
        .text(d => d.text)
        .property("selected", d => d.value === 2); // Default to 2 weeks
    windowSizeSelect.on("change", () => updateBeforeAfterPlot(loadedBaseData));

    // Set default values and trigger initial plot
    segmentBySelect.property("value", segmentByOptions[0].value);
    eventSelect.property("value", relevantEvents[0]?.date || ""); 
    customDateInput.property("value", relevantEvents[0]?.date || ""); // Pre-fill custom date with default event date
    windowSizeSelect.property("value", 2);

    updateBeforeAfterPlot(loadedBaseData);
}

// Funció per actualitzar el gràfic de canvis segons els filtres seleccionats
export function updateBeforeAfterPlot(loadedBaseData) {
    const selectedSegmentBy = d3.select("#segment-by").node().value;
    const selectedWindowSize = parseInt(d3.select("#window-size").node().value);
    
    let eventToPlot = null;
    const customDateValue = d3.select("#custom-event-date").node().value;
    const selectedEventDateDropdown = d3.select("#event-select").node().value;

    if (customDateValue) {
        // Si hi ha una data personalitzada, la utilitzem
        eventToPlot = { date: customDateValue, name: `Data Personalitzada: ${customDateValue}` };
    } else if (selectedEventDateDropdown) {
        // Si no hi ha data personalitzada, usem l'esdeveniment seleccionat del desplegable
        eventToPlot = relevantEvents.find(e => e.date === selectedEventDateDropdown);
    }

    if (loadedBaseData && eventToPlot && eventToPlot.date) {
        drawBeforeAfterPlot(loadedBaseData, d3.select("#before-after-plot-svg-container"), selectedSegmentBy, eventToPlot, selectedWindowSize);
    } else {
        // Neteja el gràfic i mostra un missatge si no hi ha esdeveniment o dades vàlides
        d3.select("#before-after-plot-svg-container").selectAll("*").remove();
        d3.select("#before-after-plot-svg-container").append("svg")
            .attr("width", "100%").attr("height", "100%")
            .append("text")
            .attr("x", "50%").attr("y", "50%").attr("text-anchor", "middle")
            .attr("class", "text-gray-500 text-lg")
            .text("Selecciona un esdeveniment o una data per visualitzar els canvis.");
    }
}

// Funció per dibuixar el gràfic de canvis (Before-After Plot)
export function drawBeforeAfterPlot(data, container, segmentByKey, event, windowSize) {
    container.selectAll("*").remove(); // Neteja qualsevol SVG preexistent

    if (!data || data.length === 0) {
        container.append("svg")
            .attr("width", "100%").attr("height", "100%")
            .append("text")
            .attr("x", "50%").attr("y", "50%").attr("text-anchor", "middle")
            .attr("class", "text-gray-500 text-lg")
            .text("No hi ha dades disponibles per a aquesta visualització.");
        return;
    }

    const eventDate = new Date(event.date); 
    
    // Defineix les finestres de temps "abans" i "després"
    const beforeStart = d3.timeWeek.offset(eventDate, -windowSize);
    const beforeEnd = d3.timeWeek.offset(eventDate, 0); // Fins a l'inici de la setmana de l'esdeveniment
    const afterStart = d3.timeWeek.offset(eventDate, 0); // Des de l'inici de la setmana de l'esdeveniment
    const afterEnd = d3.timeWeek.offset(eventDate, windowSize);

    // Les dades ja contenen les dades de simulació injectades a la càrrega inicial a index.html
    const processedData = data; 

    // Agrupa les dades per la clau de segmentació seleccionada
    const aggregatedData = d3.rollup(processedData,
        v => {
            const callsBefore = v.filter(d => d.parsedDate >= beforeStart && d.parsedDate < beforeEnd).length;
            const callsAfter = v.filter(d => d.parsedDate >= afterStart && d.parsedDate < afterEnd).length;
            return { before: callsBefore, after: callsAfter };
        },
        d => d[segmentByKey] // Clau de segmentació
    );

    // Transforma les dades agregades en el format del gràfic de dumbbell
    let plotData = Array.from(aggregatedData, ([segment, counts]) => {
        const change = (counts.before > 0) ? ((counts.after - counts.before) / counts.before) * 100 : (counts.after > 0 ? 100 : 0); // Si 'before' és 0 i 'after' > 0, considerem 100% de pujada
        return {
            segment: segment,
            before: counts.before,
            after: counts.after,
            change: change // Canvi percentual
        };
    }).filter(d => d.before > 0 || d.after > 0); // Filtra segments sense cap trucada

    // Ordena les dades segons la clau de segmentació
    if (segmentByKey === "Franja d'edat") {
        plotData.sort((a, b) => {
            return orderedAgeOptions.indexOf(a.segment) - orderedAgeOptions.indexOf(b.segment);
        });
    } else {
        plotData.sort((a,b) => b.change - a.change); // Ordena per canvi percentual (descendent per defecte si no és edat)
    }


    // Configuració de les dimensions del gràfic
    const margin = { top: 40, right: 80, bottom: 60, left: 100 };
    const containerWidth = parseInt(container.style("width"));
    const containerHeight = parseInt(container.style("height"));
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Escales
    // L'eix X ara abasta el rang complet de trucades (abans i després)
    const x = d3.scaleLinear()
        .domain([0, d3.max(plotData, d => Math.max(d.before, d.after)) || 10])
        .nice()
        .range([0, width]);

    // L'eix Y és una escala de banda per als segments (Província, Gènere, Edat)
    const y = d3.scaleBand()
        .domain(plotData.map(d => d.segment))
        .range([0, height])
        .padding(0.5); // Espaiat entre les bandes

    // Escala de colors per als punts (abans/després)
    const pointColor = d3.scaleOrdinal()
        .domain(["before", "after"])
        .range(["#ab47bc", "#6a1b9a"]); // Lila clar per "abans", lila fosc per "després"

    // Dibuixa els eixos
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d"))) // Ticks d'enters, format d'enter
        .attr("class", "x-axis")
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("class", "line-axis-label")
        .text("Nombre de Trucades");

    svg.append("g")
        .call(d3.axisLeft(y))
        .attr("class", "y-axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("class", "line-axis-label")
        .text(segmentByKey); // Etiqueta dinàmica de l'eix Y

    // Dibuixa les línies (dumbbells)
    svg.selectAll(".dumbbell-line")
        .data(plotData)
        .join("line")
        .attr("class", "dumbbell-line")
        .attr("x1", d => x(d.before))
        .attr("x2", d => x(d.after))
        .attr("y1", d => y(d.segment) + y.bandwidth() / 2)
        .attr("y2", d => y(d.segment) + y.bandwidth() / 2)
        .attr("stroke", "#999") // Gris clar per les línies
        .attr("stroke-width", 1);

    // Dibuixa els punts (abans)
    svg.selectAll(".point-before")
        .data(plotData)
        .join("circle")
        .attr("class", "point-before")
        .attr("cx", d => x(d.before))
        .attr("cy", d => y(d.segment) + y.bandwidth() / 2)
        .attr("r", 5) // Radi del cercle
        .attr("fill", pointColor("before"))
        .call(addTooltip, d => `Segment: ${d.segment}<br>Abans: ${d.before} trucades`);

    // Dibuixa els punts (després)
    svg.selectAll(".point-after")
        .data(plotData)
        .join("circle")
        .attr("class", "point-after")
        .attr("cx", d => x(d.after))
        .attr("cy", d => y(d.segment) + y.bandwidth() / 2)
        .attr("r", 5) // Radi del cercle
        .attr("fill", pointColor("after"))
        .call(addTooltip, d => `Segment: ${d.segment}<br>Després: ${d.after} trucades`);

    // Afegeix les etiquetes de canvi percentual
    svg.selectAll(".change-label")
        .data(plotData)
        .join("text")
        .attr("class", "change-label")
        .attr("x", d => x(d.after) + (d.after > d.before ? 8 : -8)) // Posiciona l'etiqueta a la dreta/esquerra del punt "després"
        .attr("y", d => y(d.segment) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.after > d.before ? "start" : "end") // Alineació del text
        .attr("fill", d => d.change >= 0 ? "#22c55e" : "#ef4444") // Verd per pujada, vermell per baixada
        .text(d => `${d.change.toFixed(1)}%`); // Format a un decimal

    // Afegeix el títol del gràfic
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("class", "text-lg font-bold text-gray-800")
        .text(`Canvis en Trucades: ${event.name} (${windowSize} setmanes abans/després)`);
}
