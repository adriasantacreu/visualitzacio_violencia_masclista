// utils.js: Conté variables globals i funcions d'utilitat compartides

// Tooltip global de D3
export const tooltip = d3.select(".tooltip");

// Funció per parsejar dates, s'espera el format "DD/MM/YYYY" del CSV
export const parseDate = d3.timeParse("%d/%m/%Y");

// Paleta de colors personalitzada (tons lilosos/violetes més distintius)
export const distinctPurplePalette = [
    "#e0b0ff", // Very light purple
    "#d290ff", // Light purple
    "#c470ff", // Medium light purple
    "#b550ff", // Medium purple
    "#a730ff", // Medium dark purple
    "#9910ff", // Dark purple
    "#8b00e0"  // Deepest purple
];

// Esdeveniments rellevants per al gràfic de canvis (excloent festivitats i esdeveniments feministes generals)
export const relevantEvents = [
    { date: "2020-03-14", name: "Inici Confinament COVID-19", type: "COVID" },
    { date: "2017-09-28", name: "Aprovació Pacte d'Estat", type: "Legal/Polític"},
    { date: "2022-10-07", name: "Llei 'Només sí és sí'", type: "Legal/Polític"},
    { date: "2018-04-26", name: "Sentència 'La Manada'", type: "Cas Mediàtic" },
    // Afegir més esdeveniments si hi ha dades concretes:
    // { date: "YYYY-MM-DD", name: "Campanya 'Hay Salida'", type: "Campanya" },
    // { date: "YYYY-MM-DD", name: "Cas Rocío Carrasco", type: "Cas Mediàtic" }
];

// Opcions de dades de simulació (mock data) per a filtres
export const provinceOptions = ['Barcelona', 'Girona', 'Lleida', 'Tarragona'];
export const genderOptions = ['Dona', 'Home', 'Altres'];
export const orderedAgeOptions = ['0-17', '18-25', '26-40', '41-60', '60+']; // Ordre definit


// Funció d'utilitat per afegir tooltips als elements D3.js
export function addTooltip(selection, contentFunction) {
    selection
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(contentFunction(d));
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });
}
