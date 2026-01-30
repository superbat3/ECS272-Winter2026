
var counter = 0;

export const Notes = (msg) => (`
    <div class='card' id='note-card'>
        
        <div class="card-content">
            <h5>${msg}</h5>
            <p>
                The median value of track popularity is 58, open console log to verify. Also, the parallel coordinates
                chart only covers the first 400 points of the spotify dataset.
            </p>
        </div>
        <div class="card-action">
            <a class="waves-effect waves-light btn-small" id='counter-button'>Have clicked this ${counter} times</a>
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