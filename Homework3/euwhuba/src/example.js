import * as d3 from 'd3';
//import spotifyJson from '../data/spotify.json';
import axios from 'axios';
import { isEmpty, debounce } from 'lodash';

const margin = { left: 50, right: 20, top: 60, bottom: 80 }
let size = { width: 0, height: 0 }
let histo = []
//let pie = []
let activeFilter = []
let resizeCheck = false
async function loadSpotifyCSV()
{// Read in csv files
    const dataFromCSV = await d3.csv('./data/spotify.csv', (d) => {
        // This callback allows you to rename the keys, format values, and drop columns you don't need
        return { track_id: d.track_id, track_name: d.track_name, track_popularity: +d.track_popularity, album_type: d.album_type,
            artist_name: d.artist_name, explicit: d.explicit, artist_popularity: +d.artist_popularity, 
            track_duration_min: +d.track_duration_ms / 60000, artist_followers: +d.artist_followers}
        })
        histo = dataFromCSV.slice()
        activeFilter = histo
        resizeCheck = true
}
loadSpotifyCSV()


const onResize = (targets) => {
    targets.forEach(target => {
        if (target.target.getAttribute('id') !== 'bar-container') return
        size = { width: target.contentRect.width, height: target.contentRect.height }
        if (!resizeCheck || size.width === 0 || size.height === 0) return
        spotyDash()

    })
}
const chartObserver = new ResizeObserver(debounce(onResize, 100))
//next is to complete
export const BarChart = () => (
  `<div class='chart-container d-flex flex-column' id='bar-container'>
    <svg id='bar-svg' width='100%' height='100%'></svg>
  </div>`
)

export function mountBarChart() { // registering this element to watch its size change
    let barContainer = document.querySelector('#bar-container')
    chartObserver.observe(barContainer)

}
function spotyDash()
{
    let barContainer = d3.select('#bar-svg')
    barContainer.selectAll('*').remove()

    const barHeight = size.height * 0.55
    const viewHeight = size.height * 0.45

    spotyHistory(barContainer, barHeight)
    initChart(barContainer, barHeight, viewHeight)
    spotyPie(barContainer, barHeight, viewHeight)

}

function spotyHistory(chartContainer, height)
{
   
    let values = histo.map(d => d.track_popularity)
    const median = d3.median(values)


    let xExtents = d3.extent(values)
    let xScale = d3.scaleLinear()
    .domain(xExtents)
    .nice()
    .range([margin.left, size.width - margin.right])

    const histoBin = d3.bin()
    .domain(xScale.domain())
    .thresholds(15)(values)

    let yScale = d3.scaleLinear()
    .domain([0, d3.max(histoBin, d => d.length)])
    .nice()
    .range([height - margin.bottom, margin.top])

    const xAxis = chartContainer.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        
    const yAxis = chartContainer.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale))

    const xLabel = chartContainer.append('text')
    .attr('x', size.width / 2)
    .attr('y', height - margin.bottom / 2)
    .style('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '.8rem')
    .text('Track Popularity')


    const yLabel = chartContainer.append('g')
    .attr('transform', `translate(12, ${height / 2}) rotate(-90)`)
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
        .attr('y', yScale(0))
        .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
        .attr('height', 0)
        .attr('fill', 'teal')
        .transition()
        .duration(600)
        .attr('y', d => yScale(d.length))
        .attr('height', d => yScale(0) - yScale(d.length))

    
    const histoMedian = chartContainer.append('line')
        .attr('x1', xScale(median))
        .attr('x2', xScale(median))
        .attr('y1', yScale(0)) // -2
        .attr('y2', yScale(d3.max(histoBin, d => d.length)))
        .attr('stroke', 'crimson')
       // .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .raise()

    const brush = d3.brushX()
     .extent([[margin.left, margin.top], [size.width - margin.right, height - margin.bottom]])
     .on('end', ({ selection }) => {
        if (!selection) {
           activeFilter = histo
        } 
        else {
            const [x0, x1] = selection.map(xScale.invert)
            activeFilter = histo.filter(d => d.track_popularity >= x0 && d.track_popularity <= x1)
        }
        spotyDash()  
    })
    const brushed = chartContainer.append('g').call(brush)
   
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
   // .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4')

    legend.append('text')
    .attr('x', 22)
    .attr('y', 34)
    .style('font-size', '.75rem')
    .text('Median popularity')
}

function spotyPie(chartContainer, offsetY, height)
{
    const spotyFilter = activeFilter.length ? activeFilter : histo
    
    const spotyPieFilter = Array.from(
        d3.rollup(spotyFilter, v => v.length, d => d.album_type),
        ([label, value]) => ({ label, value })
    )
    

    const pieColor = d3.scaleOrdinal()
    .domain(spotyPieFilter.map(d => d.label))
    .range(d3.schemeSet2)
    
    const total = d3.sum(spotyPieFilter, d => d.value)
    const radius = Math.min(size.width * 0.35, height) / 2 - 40
    
    const g = chartContainer.append('g')
    .attr('transform', `translate(${size.width * 0.82}, ${offsetY + height / 2})`)

    const spotyPieChart = d3.pie().value(d => d.value)

    const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)

    //console.log('pie data:', spotyPieFilter)

    
    const pieEls = g.selectAll('path')
    .data(spotyPieChart(spotyPieFilter))
    .join('path')
    .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
    .attr('d', d => arc({ ...d, startAngle: 0, endAngle: 0 }))
    .transition()
    .duration(700)
    .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
        return t => arc(i(t))
    })

    const pieLabels = g.selectAll('text')
    .data(spotyPieChart(spotyPieFilter))
    .join('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .style('font-size', '.7rem')
     .text(d => total === 0 ? '' : `${((d.data.value / total) * 100).toFixed(1)}%`)

    const spotyAlbum = chartContainer.append('text')
    .attr('x', size.width * 0.82)
    .attr('y', offsetY + margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '1rem')
    .style('font-weight', 'bold')
    .text('Album Type Distribution Filtered')

    const legend = chartContainer.append('g')
    .attr('transform', `translate(${size.width * 0.82 + radius + 30}, ${offsetY + height / 2 - radius})`)

    const legendItem = legend.selectAll('g')
    .data(spotyPieFilter)
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

function initChart(svg, offsetY, height) 
{
    const paraData = activeFilter.length ? activeFilter : histo

    const paraWidth  =  size.width * 0.65 - margin.left
    const paraHeight = height - margin.top - margin.bottom
    const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${offsetY + margin.top})`)
    

    const paraDimension = [ 'track_popularity', 'artist_popularity', 'track_duration_min', 'artist_followers' ]
    
    const xScale = d3.scalePoint()
    .domain(paraDimension)
    .range([0, paraWidth])
    .padding(0.5)
    
    const yScale = {}
    paraDimension.forEach(dim => {
        yScale[dim] = d3.scaleLinear()
        .domain(d3.extent(histo, d => +d[dim]))
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
     .join(
        enter => enter.append('path')
         .attr('d', path)
         .attr('fill', 'none')
         .attr('stroke', popularityColor)
         .attr('opacity', 0)
         .transition().duration(400)
         .attr('opacity', 0.3),
        update => update.transition().duration(400).attr('d', path),
        exit => exit.transition().duration(300).attr('opacity', 0).remove()
     )


    
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
     .attr('y', offsetY + margin.top / 2)
     .attr('text-anchor', 'middle')
     .style('font-size', '1rem')
     .style('font-weight', 'bold')
     .text('Parallel Coordinates: Filtered Tracks) ')
   
    function popularityColor(d) 
    {
        if (d.track_popularity >= 70) return 'crimson'
        if (d.track_popularity >= 40) return 'green'
        return 'steelblue'
     }
    const legend = g.append('g')
    .attr('transform', `translate(${paraWidth - 120}, 10)`)

    legend.append('line')
     .attr('x1', 0).attr('x2', 20)
     .attr('y1', 8).attr('y2', 8)
     .attr('stroke', 'crimson').attr('stroke-width', 2)

    legend.append('text')
     .attr('x', 26).attr('y', 12)
     .style('font-size', '.8rem')
     .text('High popularity')

    legend.append('line')
     .attr('x1', 0).attr('x2', 20)
     .attr('y1', 28).attr('y2', 28)
     .attr('stroke', 'green').attr('stroke-width', 2)

    legend.append('text')
     .attr('x', 26).attr('y', 32)
     .style('font-size', '.8rem')
     .text('Medium popularity')

    legend.append('line')
     .attr('x1', 0).attr('x2', 20)
     .attr('y1', 48).attr('y2', 48)
     .attr('stroke', 'steelblue').attr('stroke-width', 2)

    legend.append('text')
     .attr('x', 26).attr('y', 52)
     .style('font-size', '.8rem')
     .text('Low popularity')
}


