import { el } from "./dom.js"
import { setProgress } from "./utils.js"

console.log("Energy UI modular loaded")

el.runSim.onclick = () => {

    const x = []
    const y = []

    for(let i=0;i<24;i++){
        x.push(i)
        y.push(Math.random()*5)
    }

    Plotly.newPlot("chart",[{
        x:x,
        y:y,
        mode:"lines",
        name:"Demo load"
    }])

}
