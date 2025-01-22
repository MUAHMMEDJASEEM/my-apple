import React, { useState } from 'react';
import './App.css';

const KeystrokeAuthApp = () => {
    const [registrationVectors, setRegistrationVectors] = useState([]);
    const [holdTimes, setHoldTimes] = useState([]);
    const [medianVector, setMedianVector] = useState(null);
    const [medianHoldVector, setMedianHoldVector] = useState(null);
    const [keystrokeTimes, setKeystrokeTimes] = useState([]);
    const [lastTime, setLastTime] = useState(null);
    const [authResult, setAuthResult] = useState({
        finalScore: 0,
        yScores: [],
        yScoreSum: 0,
        manhattanDistance: 0,
    });
    const [authInput, setAuthInput] = useState('');
    const [authAttempts, setAuthAttempts] = useState([]);
    const targetText = "toothbrush apple";

    const handleKeyPress = (e) => {
        const currentTime = Date.now();
        if (lastTime) {
            const timeDiff = currentTime - lastTime;
            if (keystrokeTimes.length < targetText.length - 1) {
                setKeystrokeTimes([...keystrokeTimes, timeDiff]);
            }
        }
        setLastTime(currentTime);
    };

    const handleKeyDown = (e) => {
        if (e.key.length === 1 && holdTimes.length < targetText.length) {
            const startTime = Date.now();
            setHoldTimes([...holdTimes, { key: e.key, startTime }]);
        }
    };

    const handleKeyUp = (e) => {
        const endTime = Date.now();
        setHoldTimes((prev) =>
            prev.map((entry) =>
                entry.key === e.key && !entry.endTime ? { ...entry, endTime } : entry
            )
        );
    };

    const handleRegistrationChange = (value) => {
        if (!targetText.startsWith(value)) {
            resetInputState();
            return "";
        }
        return value;
    };

    const handleRegistrationSubmit = (value) => {
        if (value !== targetText) {
            resetInputState();
            return;
        }

        const validHoldTimes = holdTimes.map(({ startTime, endTime }) => {
            if (startTime && endTime) {
                return endTime - startTime;
            }
            return 0;
        });

        if (keystrokeTimes.length === targetText.length - 1 && validHoldTimes.length === targetText.length) {
            setRegistrationVectors([...registrationVectors, { intervals: keystrokeTimes, holds: validHoldTimes }]);
            resetInputState();
        }

        if (registrationVectors.length === 4) {
            const medianVector = calculateMedianVector(registrationVectors.map((v) => v.intervals));
            const medianHoldVector = calculateMedianVector(registrationVectors.map((v) => v.holds));
            setMedianVector(medianVector);
            setMedianHoldVector(medianHoldVector);
        }
    };

    const handleAuthChange = (value) => {
        if (!targetText.startsWith(value)) {
            setAuthInput('');
            resetInputState();
            return;
        }
        setAuthInput(value);
    };

    const handleAuthSubmit = (value) => {
        if (value !== targetText) {
            resetInputState();
            return;
        }

        const validHoldTimes = holdTimes.map(({ startTime, endTime }) => {
            if (startTime && endTime) {
                return endTime - startTime;
            }
            return 0;
        });

        if (keystrokeTimes.length === targetText.length - 1 && validHoldTimes.length === targetText.length) {
            setAuthAttempts([...authAttempts, { intervals: keystrokeTimes, holds: validHoldTimes }]);

            if (medianVector && medianHoldVector) {
                const scalingFactors = calculateScalingFactors(medianVector, medianHoldVector);

                const yScores = calculateYScores(medianVector, medianHoldVector, keystrokeTimes, validHoldTimes, scalingFactors);
                const yScoreSum = yScores.reduce((sum, score) => sum + score, 0);
                const finalScore = yScoreSum / yScores.length;

                const manhattanDistance = calculateManhattanDistance(registrationVectors, medianVector, medianHoldVector, keystrokeTimes, validHoldTimes, scalingFactors);
                const scaledManhattanDistance = manhattanDistance / (keystrokeTimes.length + validHoldTimes.length);

                setAuthResult({
                    finalScore,
                    yScores,
                    yScoreSum,
                    manhattanDistance: scaledManhattanDistance,
                });
            } else {
                // If median vectors are not available, handle the error gracefully
                console.error("Median vectors are not available for authentication.");
                setAuthResult({
                    finalScore: 0,
                    yScores: [],
                    yScoreSum: 0,
                    manhattanDistance: 0,
                });
            }

            resetInputState();
        } else {
            // Handle incomplete data, like missing keystrokeTimes or validHoldTimes
            console.error("Keystroke times or hold times are incomplete for authentication.");
            setAuthResult({
                finalScore: 0,
                yScores: [],
                yScoreSum: 0,
                manhattanDistance: 0,
            });
        }
    };

    const calculateMedianVector = (vectors) => {
        if (vectors.length === 0) return null;

        const vectorLength = vectors[0].length;
        const medianVector = new Array(vectorLength);

        for (let i = 0; i < vectorLength; i++) {
            const values = vectors.map((vector) => vector[i]);
            values.sort((a, b) => a - b);

            const middle = Math.floor(values.length / 2);
            medianVector[i] = values.length % 2 === 0
                ? (values[middle - 1] + values[middle]) / 2
                : values[middle];
        }

        return medianVector;
    };

    const calculateScalingFactors = (medianIntervals, medianHolds) => {
        const intervalScalingFactors = medianIntervals.map(
            (value) => (value !== 0 ? 1 / value : 1) // Avoid division by zero
        );
        const holdScalingFactors = medianHolds.map(
            (value) => (value !== 0 ? 1 / value : 1) // Avoid division by zero
        );
        return { intervalScalingFactors, holdScalingFactors };
    };

    const calculateYScores = (medianIntervals, medianHolds, authIntervals, authHolds, scalingFactors) => {
        const { intervalScalingFactors, holdScalingFactors } = scalingFactors;

        const scaledIntervals = authIntervals.map((value, index) => value * intervalScalingFactors[index]);
        const scaledHolds = authHolds.map((value, index) => value * holdScalingFactors[index]);

        const scaledMedians = [
            ...medianIntervals.map((value, index) => value * intervalScalingFactors[index]),
            ...medianHolds.map((value, index) => value * holdScalingFactors[index]),
        ];

        const scaledAuth = [...scaledIntervals, ...scaledHolds];

        return scaledAuth.map((value, index) => {
            const median = scaledMedians[index];
            const rangeLimits = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
            const percentageDiff = Math.abs(value - median) / median;

            for (let i = 0; i < rangeLimits.length; i++) {
                if (percentageDiff <= rangeLimits[i]) {
                    return 10 - i;
                }
            }
            return 0;
        });
    };

    const calculateManhattanDistance = (registrationVectors, medianIntervals, medianHolds, authIntervals, authHolds, scalingFactors) => {
        const { intervalScalingFactors, holdScalingFactors } = scalingFactors;
    
        // Calculate the max registration vector for each element
        const maxRegistrationIntervals = [];
        const maxRegistrationHolds = [];
    
        for (let i = 0; i < registrationVectors[0].length; i++) {
            const intervalValues = registrationVectors.map(v => v.intervals[i]);
            const holdValues = registrationVectors.map(v => v.holds[i]);
    
            maxRegistrationIntervals.push(Math.max(...intervalValues));
            maxRegistrationHolds.push(Math.max(...holdValues));
        }
    
        const scaledIntervals = authIntervals.map((value, index) => value * intervalScalingFactors[index]);
        const scaledHolds = authHolds.map((value, index) => value * holdScalingFactors[index]);
    
        const scaledMedians = [
            ...medianIntervals.map((value, index) => value * intervalScalingFactors[index]),
            ...medianHolds.map((value, index) => value * holdScalingFactors[index]),
        ];
    
        const scaledAuth = [...scaledIntervals, ...scaledHolds];
        const scaledMaxRegistration = [
            ...maxRegistrationIntervals,
            ...maxRegistrationHolds,
        ];
    
        // Calculate the Manhattan Distance using the max registration values for normalization
        const manhattanDistance = scaledMedians.reduce((sum, value, index) => {
            const maxVal = scaledMaxRegistration[index] || 1;  // Prevent division by zero
            const diff = Math.abs(value - scaledAuth[index]);
            return sum + diff / maxVal;  // Normalize by the max value
        }, 0);
    
        return manhattanDistance;
    };
    

    const resetInputState = () => {
        setKeystrokeTimes([]);
        setHoldTimes([]);
        setLastTime(null);
    };

    return (
        <div className="app-container">
            <h1>Keystroke Dynamics Authentication</h1>

            <div>
                <h2>Registration</h2>
                <p>Type the text: "{targetText}"</p>
                <input
                    type="text"
                    onKeyPress={handleKeyPress}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onChange={(e) => {
                        e.target.value = handleRegistrationChange(e.target.value);
                        if (e.target.value === targetText) {
                            handleRegistrationSubmit(e.target.value);
                            e.target.value = "";
                        }
                    }}
                />
                <p>Registered Samples: {registrationVectors.length} / 5</p>
            </div>

            <div>
                <h2>Authentication</h2>
                <p>Type the text: "{targetText}"</p>
                <input
                    type="text"
                    value={authInput}
                    onKeyPress={handleKeyPress}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onChange={(e) => {
                        handleAuthChange(e.target.value);
                        if (e.target.value === targetText) {
                            handleAuthSubmit(e.target.value);
                            e.target.value = "";
                        }
                    }}
                />
                {medianVector && (
                    <div className="average-vector-section">
                        <h3>Median Vector</h3>
                        <table className="vector-table">
                            <thead>
                                <tr>
                                    {medianVector.map((_, index) => (
                                        <th key={index}>Interval {index + 1}</th>
                                    ))}
                                    {medianHoldVector.map((_, index) => (
                                        <th key={`hold-${index}`}>Hold {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {medianVector.map((value, index) => (
                                        <td key={index}>{value.toFixed(2)}</td>
                                    ))}
                                    {medianHoldVector.map((value, index) => (
                                        <td key={`hold-${index}`}>{value.toFixed(2)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {authResult.finalScore > 0 && (
                    <div>
                        <p>Final Score: {authResult.finalScore.toFixed(2)}</p>
                        <p>Y-Scores: {authResult.yScores.join(", ")}</p>
                        <p>Scaled Manhattan Distance: {authResult.manhattanDistance.toFixed(2)}</p>
                        <div>
                            {authResult.finalScore >= 5 && authResult.manhattanDistance < 0.18 ? (
                                <p>Accepted</p>
                            ) : (
                                <p>Not Accepted</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KeystrokeAuthApp;
