const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { randomInt } = require('crypto');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let stateTimeout; 

let activeSensors = [0, 0, 0, 0];
let touchCheckTimeout = null;
let chosenOne;
let chosenOne2;
let chosenOne3;
let dillemaOption1;
let dillemaOption2;

app.use(express.static('public'));
app.use('/dilemmas', express.static('/media/martijn/HEMA_8GB/dilemmas'));

function runPythonScript() {
    const pythonProcess = spawn('sudo', ['python3', '/home/martijn/waardenzegger/handler.py']);
    //const pythonProcess2 = spawn('sudo', ['python3', '/home/martijn/waardenzegger/stripHandler.py']);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python script exited with code ${code}`);
    });
}

io.emit('turn_off_all_leds');

// Optional: Explicitly set up route for node_modules if you need to serve files directly from it
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

function formatTextToArray(filePath) {
    // Read the file content
    const text = fs.readFileSync(filePath, 'utf8');

    // Split the text into an array of lines, then map each line to remove the numbers
    return text.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim());
}

const sentencesArray = formatTextToArray('//media/martijn/HEMA_8GB/dilemmas/dilemmas.txt');
console.log(sentencesArray); // This will output the array of sentences

function pickNewDilemmas() {
    dillemaOption1 = randomInt(1, 24); // randomInt is inclusive of the min and exclusive of the max
    do {
        dillemaOption2 = randomInt(1, 24);
    } while (dillemaOption1 === dillemaOption2);
    
    var dillemas = [dillemaOption1, dillemaOption2];

    io.emit('dillemas', dillemas);
    io.emit('dillemasText', sentencesArray);
    console.log("Dillema's set! " + dillemas);
}

let state = {
    currentState: 'state1',
    states: {
        state0: {
            //Time out
            name: 'state0',
            color: 'blue',
            text: 'Start screen',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 10000        // 5 seconds
        },
        state1: {
            //Het start/wacht scherm voordat de experience begint. 
            name: 'state1',
            color: 'blue',
            text: 'Start screen',
            nextAction: 'buttonPress'  // Defines what should trigger the next state
        },
        state2: {
            //Deelnemers leggen hun handen op de sensoren, er wordt gegekeken wie er mee doen. 
            name: 'state2',
            color: 'blue',
            text: 'Leg je hand op de paarse hand voor je',
            nextAction: 'timerTouch',  // A simulated sensor input triggers the next state
            timerDuration: 100000
            //nextAction: 'buttonPress'  // Defines what should trigger the next state
        },
        state3: {
            //De waardenzegger kiest 1 deelnemer uit om een dilemma te kiezen 
            name: 'state3',
            color: 'blue',
            ledAction: '1',
            text: 'Ik kies nu iemand uit...',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 7000        // 6 seconds
        },
        state4: {
            //Twee dillema's verschijnen, de uitgekozen persoon kiest er een
            name: 'state4',
            color: 'blue',
            text: 'Kies dillema',
            nextAction: 'buttonPressDillema'
        },
        state5: {
            //Beargumenteer de keuze voor het dilemma
            name: 'state5',
            color: 'blue',
            text: 'Beargumenteer de keuze',
            nextAction: 'buttonPress',       // Wait for a specified time before moving to the next state
        },
        state6: {
            //Participanten worden gevraagt om aan de waardenschijf te draaien. 
            name: 'state6',
            color: 'blue',
            text: 'Draai aan de schijf',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 7000        // 5 seconds
        },
        state7: {
            //Bekijk de waardenschijf
            name: 'state7',
            color: 'blue',
            text: 'Bekijk de waarde voor je',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 10000        // 5 seconds
        },
        state8: {
            //Is de gekozen waarde met het dillema positief of negatief?
            name: 'state8',
            color: 'blue',
            text: 'Is de gekozen waarde met het dillema positief of negatief?',
            nextAction: 'buttonPress',   
        },
        state9: {
            //Welk dillema kies jij bij jouw waarde? 
            name: 'state9',
            color: 'blue',
            text: 'Hoe ga je met dit dillema om',
            nextAction: 'buttonPress',       // Wait for a specified time before moving to the next state
        },
        state10: {
            //Leg je handen weer op de sensor
            name: 'state10',
            color: 'blue',
            text: 'Ik kies nu weer iemand uit...',
            nextAction: 'timerTouch2',       // Wait for a specified time before moving to the next state
            timerDuration: 10000        // 5 seconds
        },
        state11: {
            //De waardenzegger kiest 1 deelnemer uit om een dilemma te kiezen 
            name: 'state11',
            color: 'blue',
            ledAction: '5',
            text: 'Ik kies nu iemand uit...',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 7000        // 5 seconds
        },
        state12: {
            //Waarom?
            name: 'state12',
            color: 'blue',
            text: 'Wie zijn er bij dit dillema vertrokken',
            nextAction: 'buttonPress',       // Wait for a specified time before moving to the next state
            timerDuration: 10000        // 10 seconds
        },
        state13: {
            //Zelf een dillema toevoegen!
            name: 'state13',
            color: 'blue',
            text: 'end',
            nextAction: 'buttonPress',       // Wait for a specified time before moving to the next state
        },
        state14: {
            //Einde, bedankt
            name: 'state14',
            color: 'blue',
            text: 'end',
            nextAction: 'timer',       // Wait for a specified time before moving to the next state
            timerDuration: 10000        // 10 seconds
        }
    }
};

const stateTransition = (currentStateName, nextStateName) => {
    const nextState = state.states[nextStateName];

    if (!nextState) {
        console.error(`Invalid next state: ${nextStateName}`);
        return;
    }

    //check for timerTouch
    if (nextState.nextAction === 'timerTouch') {
        startTimerTouch();
    }

    if(nextState.nextAction === 'timerTouch2') {
        startTimerTouch2();
    }

    // Immediately update the current state and inform all clients
    state.currentState = nextStateName;
    io.emit('stateUpdate', nextState);

    console.log(`Transitioned to: ${nextStateName}`);

    // If the next state uses a timer, prepare the transition that comes after the timer
    if (nextState.nextAction === 'timer' && nextState.timerDuration) {
        setTimeout(() => {
            const nextStateAfterTimer = getNextStateName(nextStateName);
            stateTransition(nextStateName, nextStateAfterTimer);
        }, nextState.timerDuration);
    }

    if (nextStateName == 'state4') {
        pickNewDilemmas();
    }

    if(nextStateName == 'state6') {
        io.emit('turn_off_all_leds');
    }

    if(nextStateName == 'state13') {
        io.emit('turn_off_all_leds');
    }

    // Reset the global timeout every time a state transition occurs
    clearTimeout(stateTimeout);  // Clear any existing timeout

    if (nextStateName !== 'state1') { 
        stateTimeout = setTimeout(() => {
            io.emit('turn_off_all_leds');
            stateTransition(state.currentState, 'state1');  // Transition to state0 after 90 seconds
            console.log("waarom werkt dit nou opeens niet meer?");
        }, 181000);  // Set new timeout for 90 seconds
    }
};

function getNextStateName(currentStateName) {
    // Extract the number from the currentStateName
    const currentStateNumber = parseInt(currentStateName.replace('state', ''), 10);
    
    // Create the next state's name by incrementing the number
    const nextStateName = 'state' + (currentStateNumber + 1);
    
    // Ensure the next state exists, otherwise loop back or handle error
    if (state.states[nextStateName]) {
        return nextStateName;
    } else {
        console.error("Next state does not exist, going back to 1");
        io.emit('turn_off_all_leds');
        return 'state1'; // going back to the start'
    }
}

function startTimerTouch() {
    activeSensors = [0,0,0,0];

    touchCheckTimeout = setTimeout(() => {
        // After 15 seconds, decide the next state based on sensors touched
        const touchedSensorsCount = activeSensors.filter(status => status === 1).length;
    
        // Log the sensor touch status
        console.log(`Sensor touch status: [${activeSensors.join(', ')}]`);
    
        // Decide the next state based on the number of sensors touched
        if (touchedSensorsCount <= 1) {
            stateTransition(state.currentState, 'state1');
        } else {
            stateTransition(state.currentState, getNextStateName(state.currentState));
        };

        io.emit('activeSensors', activeSensors);

        chosenOne = chooseRandomTouchedSensor(activeSensors);
        console.log("Participant chosen: " + chosenOne);
        io.emit('chosenOne', chosenOne);
        console.log(activeSensors);

        // Reset the touch check state
        activeSensors = [0,0,0,0];

        touchCheckTimeout = null;

        switch(chosenOne) {
            case 0:
                io.emit('choose_participant', { number_of_final_led: 1 });
                break;
            case 1:
                io.emit('choose_participant', { number_of_final_led: 5 });
                break;
            case 2:
                io.emit('choose_participant', { number_of_final_led: 13 });
                break;
            case 3:
                io.emit('choose_participant', { number_of_final_led: 9 });
                break;
            default: 
        }
        // Call the function once to set the initial dilemmas
    }, 13000);  // 15 seconds
}

function startTimerTouch2() {
    activeSensors = [0,0,0,0];

    touchCheckTimeout = setTimeout(() => {
        // After 15 seconds, decide the next state based on sensors touched
        const touchedSensorsCount = activeSensors.filter(status => status === 1).length;
    
        // Log the sensor touch status
        console.log(`Sensor touch status: [${activeSensors.join(', ')}]`);
    
        // Decide the next state based on the number of sensors touched
        if (touchedSensorsCount <= 1) {
            stateTransition(state.currentState, 'state1');
        } else {
            stateTransition(state.currentState, getNextStateName(state.currentState));
        };

        io.emit('activeSensors', activeSensors);

        chosenOne2 = chooseRandomTouchedSensor(activeSensors);

        do {
            chosenOne3 = chooseRandomTouchedSensor(activeSensors);
        } while (chosenOne3 === chosenOne2);

        console.log("Participant chosen2: " + chosenOne2);
        io.emit('chosenOne2', chosenOne2);
        io.emit('chosenOne3', chosenOne3);

        console.log(activeSensors);

        // Reset the touch check state
        activeSensors = [0,0,0,0];

        touchCheckTimeout = null;

        switch(chosenOne2) {
            case 0:
                io.emit('choose_participant', { number_of_final_led: 1 });
                break;
            case 1:
                io.emit('choose_participant', { number_of_final_led: 5 });
                break;
            case 2:
                io.emit('choose_participant', { number_of_final_led: 13 });
                break;
            case 3:
                io.emit('choose_participant', { number_of_final_led: 9 });
                break;
            default: 
        }
        // Call the function once to set the initial dilemmas
    }, 13000);  // 15 seconds
}

function chooseRandomTouchedSensor(sensors) {
    // Filter to get the indices of touched sensors
    const touchedSensors = sensors.map((status, index) => status === 1 ? index : -1).filter(index => index !== -1);

    // Check if there are any touched sensors
    if (touchedSensors.length <= 0) {
        return null; // Or handle the case when no sensor is touched
    }

    // Select a random touched sensor
    const randomIndex = Math.floor(Math.random() * touchedSensors.length);
    
    return touchedSensors[randomIndex];
    //return 2;
}

io.on('connection', (socket) => {
    // Send the initial state
    socket.emit('stateUpdate', state.states[state.currentState]);

    // Listen for a button press and move to the next state if applicable
    socket.on('buttonPress', () => {
        stateTransition(state.currentState, getNextStateName(state.currentState));
    });

    socket.on('resetTimeoutTimer', () => {
        clearTimeout(stateTimeout);  // Clear any existing timeout

        // Clear the existing timer
        clearTimeout(stateTimeout);

        // Restart the timer
        stateTimeout = setTimeout(() => {
            io.emit('turn_off_all_leds');
            stateTransition(state.currentState, 'state1');
            console.log("Timer restarted");
        }, 181000);  // Set new timeout for 181 seconds
    });

    socket.on('touch_event', (data) => {
        // Now you can use data.sensor_id and data.state
        if (data.state === 'touched') {
            console.log(`Sensor ${data.sensor_id} was touched`);
            //socket.emit('turnOnLed', {ring_number: 1, color: 'WHITE'});
            activeSensors[data.sensor_id] = 1;
        } else if (data.state === 'untouched') {
            console.log(`Sensor ${data.sensor_id} was untouched`);
            // Add logic to handle the sensor being untouched
        }
    });

    socket.on('saveToFile', (data) => {
        const text = data + '\n'; // Append a newline character for the next line
        fs.appendFile('/media/martijn/HEMA_8GB/nieuweDilemmas.txt', text, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.error("succesfully writen to file");
            }
        });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
    runPythonScript();  // This will start the Python script
});

