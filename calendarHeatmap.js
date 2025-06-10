// calendarHeatmap.js: Conté la lògica per dibuixar el mapa de calor del calendari
import { addTooltip, tooltip, parseDate } from './utils.js';

export function drawCalendarHeatmap(data, container, tooltipRef, parseDateRef, relevantEventsRef, distinctPurplePaletteRef) {
    container.selectAll("*").remove(); // Neteja qualsevol SVG preexistent
    
    // Per a aquesta visualització, assumim que relevantEventsRef i distinctPurplePaletteRef poden ser ignorats
    // ja que la llegenda del calendari utilitza eventColor localitzat.
    // Si calguessin, es passarien des de utils.js o es re-definirien localment.

    const dataByDay = d3.rollup(data, v => v.length, d => d3.timeDay.floor(d.parsedDate));
    const yearsData = Array.from(d3.group(data, d => d.parsedDate.getFullYear()).keys()).sort();
    
    // Dades d'esdeveniments especials (copiades localment o importades)
    const specialEvents = [         
        { month: 3, day: 8, name: "Dia de la Dona", type: "Reivindicatiu" }, 
        { date: "2018-03-08", name: "Vaga Feminista 8M", type: "Reivindicatiu" }, 
        { month: 11, day: 25, name: "25N", type: "Reivindicatiu" }, 
        { date: "2020-03-14", name: "Inici Confinament COVID-19", type: "COVID" }, 
        { date: "2017-09-28", name: "Aprovació Pacte d'Estat", type: "Legal/Polític"}, 
        { date: "2022-10-07", name: "Llei 'Només sí és sí'", type: "Legal/Polític"}, 
        { date: "2018-04-26", name: "Sentència 'La Manada'", type: "Cas Mediàtic" }, 
        { month: 1, day: 1, name: "Any Nou", type: "Festivitat" }, 
        { month: 6, day: 24, name: "Sant Joan", type: "Festivitat" }, 
        { month: 12, day: 25, name: "Nadal", type: "Festivitat" }, 
        { month: 12, day: 10, name: "Dia Drets Humans", type: "Festivitat" }, 
        { date: "2021-11-25", name: "Campanya 'Visibilitzem violències'", type: "Campanya" },
    ];
    // Colors per als esdeveniments
    const eventColor = d3.scaleOrdinal().domain(["Reivindicatiu", "COVID", "Legal/Polític", "Cas Mediàtic", "Festivitat", "Campanya"]).range(["#c2185b","#00796b", "#1976d2","#ef6c00","#388e3c","#7b1fa2"]);
    
    const eventsByDate = new Map();
    yearsData.forEach(year => {
        specialEvents.forEach(e => {
            let eventDate;
            if (e.date) eventDate = new Date(e.date + "T00:00:00");
            else eventDate = new Date(year, e.month - 1, e.day); // Mesos base 0
            if (eventDate.getFullYear() === year) {
               eventsByDate.set(d3.timeDay.floor(eventDate).getTime(), e);
            }
        });
    });

    const cellSize = 17; // Mida de cada cel·la del dia
    const yearHeight = cellSize * 7 + 40; // Alçada per a cada any en el gràfic
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", yearsData.length * yearHeight + 20); // Alçada total de l'SVG

    // Escala de color per al mapa de calor (interpolació de morats)
    const color = d3.scaleSequential(d3.interpolatePurples).domain([0, d3.max(dataByDay.values()) || 1]);
    
    // Grups per a cada any
    const yearSvg = svg.selectAll("g").data(yearsData).join("g").attr("transform", (d, i) => `translate(50, ${i * yearHeight + 50})`);
    
    // Títol de l'any
    yearSvg.append("text").attr("x", -5).attr("y", -10).attr("class", "calendar-year").text(d => d);
    
    // Cel·les per a cada dia
    const dayCells = yearSvg.selectAll(".day").data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1))).join("g");
    
    // Rectangle del dia (color segons el volum de trucades)
    dayCells.append("rect")
        .attr("width", cellSize - 1.5)
        .attr("height", cellSize - 1.5)
        .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
        .attr("y", d => d.getUTCDay() * cellSize)
        .attr("fill", d => color(dataByDay.get(d) || 0));
    
    // Afegeix el tooltip a cada cel·la
    dayCells.call(addTooltip, d => {
        let eventInfo = "";
        const event = eventsByDate.get(d.getTime());
        if (event) eventInfo = `<br><strong>${event.name}</strong>`;
        return `${d3.timeFormat("%d/%m/%Y")(d)}<br>${dataByDay.get(d) || 0} trucades${eventInfo}`;
    });

    // Afegir marcador per a esdeveniments especials (rectangle amb vora)
    dayCells.append("rect")
        .attr("class", "event-marker-rect")
        .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
        .attr("y", d => d.getUTCDay() * cellSize)
        .attr("width", cellSize - 1.5)
        .attr("height", cellSize - 1.5)
        .style("stroke", d => {
            const event = eventsByDate.get(d.getTime());
            return event ? eventColor(event.type) : "none";
        });
}

// Funció per dibuixar la llegenda del calendari (si es necessita)
export function drawCalendarLegend() {
    // Defineix els colors per als tipus d'esdeveniments
    const eventColor = d3.scaleOrdinal().domain(["Reivindicatiu", "COVID", "Legal/Polític", "Cas Mediàtic", "Festivitat", "Campanya"]).range(["#c2185b","#00796b", "#1976d2","#ef6c00","#388e3c","#7b1fa2"]);
    const legendContainer = d3.select("#legend-calendar");
    legendContainer.selectAll("*").remove(); // Neteja la llegenda existent
    legendContainer.append('h3').attr('class', 'text-sm font-semibold text-gray-500 mt-4').text("Llegenda d'Esdeveniments");
    
    const legendItems = legendContainer.selectAll(".legend-item").data(eventColor.domain()).enter().append("div").attr("class", "flex items-center");
    legendItems.append("div").attr("class", "w-3 h-3 mr-2 border-2").style("border-color", d => eventColor(d));
    legendItems.append("span").attr("class", "text-sm text-gray-600").text(d => d);
}
