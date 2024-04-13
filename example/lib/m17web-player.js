import init, { decode } from './M17web/m17web_wasm.js';

class M17webPlayer extends HTMLElement {
    constructor() {
        super();
    }

    static observedAttributes = ["proxy", "label"];

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);
        switch(name) {
            case "proxy":
                this.proxy = newValue;
            break;
            case "label":
                this.label = newValue;
            break;
        }
    }

    proxy = '';
    label = '';

    connectedCallback() {
        // M17 Web Player stuff

        let ws;

        let audioCtx;
        let receive_buffer = new Uint8Array(0);

        let label = this.label;
        let proxy = this.proxy;

        let gain = 3;

        let src_call = this.label;
        let playerSymbol = '▶';
        let playerActive = false;

        init();

        function connectToServer() {
            ws = new WebSocket(proxy);
            ws.binaryType = "arraybuffer";
            ws.onopen = function () {
                console.log("Connected to server");
            };
            ws.onclose = function () {
                console.log("Disconnected from server");
            };
            ws.onerror = function (evt) {
                console.log("Error: " + evt.data);
            };
            ws.onmessage = function (evt) {
                let received_msg = JSON.parse(evt.data);
                src_call = received_msg.done == true ? label : received_msg.src_call;
                receive_buffer = new Uint8Array([...receive_buffer, ...new Uint8Array(arrayToArrayBuffer(received_msg.c2_stream))]);
                if (receive_buffer.length >= 128 || received_msg.done) {
                    playResult(decode(receive_buffer));
                    receive_buffer = new Uint8Array(0);
                }
                shadow.getElementById("playerCallsign").textContent = src_call;
            };
        }

        function arrayToArrayBuffer(array)  {
            let arrayBuffer = new ArrayBuffer(array.length);
            let bufferView = new Uint8Array(arrayBuffer);
            for (let i = 0; i < array.length; i++) {
                bufferView[i] = array[i];
            }
            return arrayBuffer;
        }

        function togglePlay() {
            if (playerActive) {
                ws.close();
                playerActive = false;
                playerSymbol = "▶";
            } else {
                playerActive = true;
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                connectToServer();
                playerSymbol = "⏸";
            }
            shadow.getElementById("playerButton").textContent = playerSymbol;
        }

        function playResult(result) {
            let source = audioCtx.createBufferSource();
            let buffer = audioCtx.createBuffer(1, result.length, 8000);
            let data = buffer.getChannelData(0);
            for (let i = 0; i < result.length; i++) {
                data[i] = (result[i] / 32768.0) * gain;
            }
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start();
        }

        // Custom Element stuff

        const shadow = this.attachShadow({ mode: "open" });

        const table = document.createElement("table");
        let tr = table.insertRow();
        let logo = tr.insertCell();
        let callsign = tr.insertCell();
        let button = tr.insertCell();
        let slider = tr.insertCell();

        const player_logo = document.createElement("img");
        player_logo.src = "img/m17glow.png";
        player_logo.setAttribute("id", "playerLogo");
        player_logo.title = "M17web Player by OE3ANC";
        logo.appendChild(player_logo);


        const player_button = document.createElement("button");
        player_button.textContent = "▶";
        player_button.setAttribute("id", "playerButton");
        player_button.onclick = togglePlay
        button.appendChild(player_button);

        const player_callsign = document.createElement("p");
        player_callsign.textContent = src_call;
        player_callsign.setAttribute("id", "playerCallsign");
        callsign.appendChild(player_callsign);

        const player_slider = document.createElement("input");
        player_slider.setAttribute("id", "playerSlider");
        player_slider.type = "range";
        player_slider.min = 0;
        player_slider.max = 4.0;
        player_slider.step = 0.1;
        player_slider.value = 3.0;
        player_slider.addEventListener('input', function() {
            gain = this.value;
            console.log ("Volume set: ", this.value);
        }, "false");
        slider.appendChild(player_slider);


        // Create some CSS to apply to the shadow dom
        const style = document.createElement("style");
        console.log(style.isConnected);

        style.textContent = `
          #playerLogo {
            width: 50px;            
          }
        
        
          #playerButton {
            margin: 5px;
            background-color: transparent;
            background-repeat: no-repeat;
            border: none;
            cursor: pointer;
            overflow: hidden;
            outline: none;
            color: inherit;
          }

          #playerCallsign {
            color: inherit;
          }
          
          #playerSlider {
              -webkit-appearance: none;
              width: 100%;
              height: 1px;
              outline: none;
              opacity: 0.5;
              -webkit-transition: .2s;
              transition: opacity .2s;
              background: grey;

          }
          
          #playerSlider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 10px;
              height: 10px;
              border-radius: 50%; 
              background: inherit;
              cursor: pointer;
            }
            
            #playerSlider::-moz-range-thumb {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: inherit;
              cursor: pointer;
            }
    
        `;

        // Attach the created elements to the shadow dom
        shadow.appendChild(style);
        console.log(style.isConnected);
        shadow.appendChild(table);

    }

}

customElements.define("m17-web-player", M17webPlayer);
