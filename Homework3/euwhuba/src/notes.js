
var counter = 0;

export const Notes = (msg) => (`
    <div class='card' id='note-card'>
        
        <div class="card-content">
            <h5>${msg}</h5>
            <p>
                The median value of track popularity is 58. The histogram has a brush function 
                that filters the piechart values for album type and parallel coordinate graph according
                 to the popularityt amount specified by the brush. First open the Album Type
                view to see the orignal pie chart. Also, the parallel coordinates
                chart only covers the first 400 points of the spotify dataset.
                Transitions enabled on histogram/parallel coordinates.
            </p>
        </div>
    </div>
`)

export function mountCounter(element) {
    const setCounter = (count) => {
      counter = count
      element.innerHTML = `Have clicked this ${counter} times`
    }
    element.addEventListener('click', () => setCounter(counter + 1))
}