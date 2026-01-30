import * as d3 from 'd3';
//import spotifyJson from '../data/spotify.json';
import axios from 'axios';
import { isEmpty, debounce } from 'lodash';

const margin = { left: 50, right: 20, top: 60, bottom: 80 }
let size = { width: 0, height: 0 }
let histo = []
let pie = []
let resizeCheck = false
async function loadSpotifyCSV()
{// Read in csv files
    const dataFromCSV = await d3.csv('./data/spotify.csv', (d) => {
        // This callback allows you to rename the keys, format values, and drop columns you don't need
        return { track_id: d.track_id, track_name: d.track_name, track_popularity: +d.track_popularity, album_type: d.album_type,
            artist_name: d.artist_name, explicit: d.explicit, artist_popularity: +d.artist_popularity, 
            track_duration_ms: +d.track_duration_ms, artist_followers: +d.artist_followers}
        })
        histo = dataFromCSV.slice()
        pie = Array.from(d3.rollup(dataFromCSV, v => v.length,d => d.album_type),
         ([key, value]) => ({ label: key, value })
        )

        resizeCheck = true
}
loadSpotifyCSV()


const onResize = (targets) => {
    targets.forEach(target => {
        if (target.target.getAttribute('id') !== 'bar-container') return
        size = { width: target.contentRect.width, height: target.contentRect.height }
        if (!resizeCheck || size.width === 0 || size.height === 0) return
        d3.select('#bar-svg').selectAll('*').remove()

        const view = document.querySelector('#view-select')?.value || 'histogram'
        window.__switchView(view)

    })
}
const chartObserver = new ResizeObserver(debounce(onResize, 100))
//next is to complete
export const BarChart = () => (
  `<div class='chart-container d-flex flex-column' id='bar-container'>
    
    <label for="view-select" style="margin-bottom:8px;">
      Select View:
    </label>
    <select id="view-select" onchange="window.__switchView(this.value)">
      <option value="histogram">Track Popularity Distribution</option>
      <option value="parallel">Parallel Track Comparison</option>
      <option value="pie">Album Type Distribution</option>
    </select>

    <svg id='bar-svg' width='100%' height='100%'></svg>
  </div>`
)


export function mountBarChart() { // registering this element to watch its size change
    let barContainer = document.querySelector('#bar-container')
    chartObserver.observe(barContainer)

}
window.__switchView = function(view) {
  const svg = d3.select('#bar-svg')
  svg.selectAll('*').remove()

  if (view === 'histogram') {
    spotyHistory()
  } 
  else if(view =='pie')
  {
    spotyPie()
  }
  else if (view ==='parallel') {
    initChart()
  }
}

function spotyHistory()
{
    let chartContainer = d3.select('#bar-svg')
    chartContainer.selectAll('*').remove()

   
    let values = histo.map(d => d.track_popularity)
    const median = d3.median(values)
    console.log('median:', median)


    let xExtents = d3.extent(values)
    let xScale = d3.scaleLinear()
    .domain(xExtents)
    .nice()
    .range([margin.left, size.width - margin.right])

    const histoBin = d3.bin()
    .domain(xScale.domain())
    .thresholds(10)(values)

    let yScale = d3.scaleLinear()
    .domain([0, d3.max(histoBin, d => d.length)])
    .nice()
    .range([size.height - margin.bottom, margin.top])

    const xAxis = chartContainer.append('g')
        .attr('transform', `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        
    const yAxis = chartContainer.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale))

    const xLabel = chartContainer.append('text')
    .attr('x', size.width / 2)
    .attr('y', size.height - margin.bottom / 2)
    .style('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '.8rem')
    .text('Track Popularity')


    const yLabel = chartContainer.append('g')
    .attr('transform', `translate(12, ${size.height / 2}) rotate(-90)`)
    .append('text')
    .text('Number of Tracks')
    .style('font-size', '.8rem')
    .style('text-anchor', 'middle')

    const histoTitle = chartContainer.append('text')
    .attr('x', size.width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '1rem')
    .style('font-weight', 'bold')
    .text('Distribution of Track Popularity')

    const barEles = chartContainer.append('g')
        .selectAll('rect')
        .data(histoBin)
        .join('rect')
        .attr('x', d => xScale(d.x0) + 1)
        .attr('y', d => yScale(d.length))
        .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
        .attr('height', d => yScale(0) - yScale(d.length))
        .attr('fill', 'teal')
    
    const histoMedian = chartContainer.append('line')
        .attr('x1', xScale(median))
        .attr('x2', xScale(median))
        .attr('y1', yScale(0) - 2)
        .attr('y2', yScale(d3.max(histoBin, d => d.length)))
        .attr('stroke', 'crimson')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .raise()
   
    const legend = chartContainer.append('g')
    .attr('transform', `translate(${size.width - margin.right - 160}, ${margin.top})`)

    legend.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 14)
    .attr('height', 14)
    .attr('fill', 'teal')

    legend.append('text')
    .attr('x', 22)
    .attr('y', 12)
    .style('font-size', '.75rem')
    .text('Track count')

    legend.append('line')
    .attr('x1', 0)
    .attr('x2', 14)
    .attr('y1', 30)
    .attr('y2', 30)
    .attr('stroke', 'crimson')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4')

    legend.append('text')
    .attr('x', 22)
    .attr('y', 34)
    .style('font-size', '.75rem')
    .text('Median popularity')

    
}
function spotyPie()
{
    let chartContainer = d3.select('#bar-svg')
    chartContainer.selectAll('*').remove()
    console.log('pie data:', pie)


    const pieColor = d3.scaleOrdinal()
    .domain(pie.map(d => d.label))
    .range(d3.schemeSet2)
    
    const radius = Math.min(size.width, size.height) / 2 - 40
    
    const g = chartContainer.append('g')
    .attr('transform', `translate(${size.width / 2}, ${size.height / 2})`)

    const spotyPieChart = d3.pie()
    .value(d => d.value)

    const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)

    console.log('pie data:', pie)

    
    const pieEls = g.selectAll('path')
    .data(spotyPieChart(pie))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => pieColor(d.data.label))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')

    const pieLabels = g.selectAll('text')
    .data(spotyPieChart(pie))
    .join('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .style('font-size', '.7rem')
    .text(d => d.data.label)

    const spotyAlbum = chartContainer.append('text')
    .attr('x', size.width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '1rem')
    .style('font-weight', 'bold')
    .text('Album Type Distribution')

    const legend = chartContainer.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top + 20})`)

    let total = d3.sum(pie, d => d.value)

    const legendItem = legend.selectAll('g')
    .data(pie)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`)

    legendItem.append('rect')
    .attr('width', 14)
    .attr('height', 14)
    .attr('fill', d => pieColor(d.label))

    legendItem.append('text')
    .attr('x', 22)
    .attr('y', 12)
    .style('font-size', '.75rem')
    .text(d => `${d.label} (${((d.value / total) * 100).toFixed(1)}%)`)
}
function initChart() 
{
   const svg = d3.select('#bar-svg')
   svg.selectAll('*').remove()

    const paraWidth  = size.width - margin.left - margin.right
    const paraHeight = size.height - margin.top - margin.bottom
    const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    
    const paraData = histo.slice(0,400)

    const paraDimension = ['track_popularity','artist_popularity','artist_followers', 'track_duration_ms']
    
    const xScale = d3.scalePoint()
    .domain(paraDimension)
    .range([0, paraWidth])
    .padding(0.5)
    
    const yScale = {}
    paraDimension.forEach(dim => {
        yScale[dim] = d3.scaleLinear()
        .domain(d3.extent(paraData, d => +d[dim]))
        .nice()
        .range([paraHeight, 0])
        })

    const line = d3.line()
    function path(d) {
        return line(paraDimension.map(dim => [xScale(dim), yScale[dim](d[dim])]))
    }
    
    const barEls = g.append('g')
     .selectAll('path')
     .data(paraData)
     .join('path')
     .attr('d', path)
     .attr('fill', 'none')
     .attr('stroke', 'steelblue')
     .attr('stroke-width', 1)
     .attr('opacity', 0.25)
    
    const barAxis = g.selectAll('.axis')
     .data(paraDimension)
     .join('g')
     .attr('class', 'axis')
     .attr('transform', d => `translate(${xScale(d)},0)`)
    
    barAxis.each(function(d) {
        d3.select(this).call(d3.axisLeft(yScale[d]))
    })
    
    barAxis.append('text')
     .attr('y', -10)
     .attr('text-anchor', 'middle')
     .attr('fill', 'black')
     .style('font-size', '.8rem')
     .text(d => d.replace('_', ' '))

    const barParaTitle = svg.append('text')
     .attr('x', size.width / 2)
     .attr('y', margin.top / 2)
     .attr('text-anchor', 'middle')
     .style('font-size', '1rem')
     .style('font-weight', 'bold')
     .text('Parallel Coordinates: Track/Artist Popularity Association with Followers & Duration ')
    


}


