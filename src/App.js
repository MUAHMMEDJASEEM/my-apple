import React, { useState } from 'react';
import './App.css';
const KeystrokeAuthApp = () => {
    const [registrationVectors, setRegistrationVectors] = useState([]);
    const [medianVector, setMedianVector] = useState(null);
    const [keystrokeTimes, setKeystrokeTimes] = useState([]);
    const [lastTime, setLastTime] = useState(null);
    const [authResult, setAuthResult] = useState(null);
    const [authInput, setAuthInput] = useState('');
    const [vectorLengthVariation, setVectorLengthVariation] = useState(null);
    const [stdDevs, setStdDevs] = useState([]);
    const [authAttempts, setAuthAttempts] = useState([]);

    const targetText = "toothbrush apple";

    const handleKeyPress = (e, isAuth = false) => {
        const currentTime = Date.now();
        if (lastTime) {
            const timeDiff = currentTime - lastTime;
            if (keystrokeTimes.length < targetText.length - 1) {
                setKeystrokeTimes([...keystrokeTimes, timeDiff]);
            }
        }
        setLastTime(currentTime);
    };

    const handleRegistrationChange = (value) => {
        if (!targetText.startsWith(value)) {
            setKeystrokeTimes([]);
            setLastTime(null);
            return "";
        }
        return value;
    };

    const handleRegistrationSubmit = (value) => {
        if (value !== targetText) {
            setKeystrokeTimes([]);
            setLastTime(null);
            return;
        }

        if (keystrokeTimes.length === targetText.length - 1) {
            setRegistrationVectors([...registrationVectors, keystrokeTimes]);
            setKeystrokeTimes([]);
            setLastTime(null);
        }

        if (registrationVectors.length === 4) {
            const medianVector = calculateMedianVector(registrationVectors);
            setMedianVector(medianVector);

            const calculatedStdDevs = calculateStandardDeviation(registrationVectors);
            setStdDevs(calculatedStdDevs.map(() => 30));  // Assuming a fixed deviation, change this as needed
        }
    };

    const handleAuthChange = (value) => {
        if (!targetText.startsWith(value)) {
            setAuthInput('');
            setKeystrokeTimes([]);
            setLastTime(null);
            return;
        }
        setAuthInput(value);
    };

    const handleAuthSubmit = (value) => {
        if (value !== targetText) {
            setAuthInput('');
            setKeystrokeTimes([]);
            setLastTime(null);
            return;
        }

        if (keystrokeTimes.length === targetText.length - 1) {
            setAuthAttempts([...authAttempts, keystrokeTimes]);

            if (authAttempts.length + 1 === 1) {
                const medianAuthVector = calculateMedianVector([...authAttempts, keystrokeTimes]);
                const similarity = cosineSimilarity(medianVector, medianAuthVector);
                const lengthVariation = calculateLengthVariation(medianVector, medianAuthVector);
                const intervalsWithinRange = calculateIntervalsWithinRange(medianAuthVector);
                const yScores = calculateYScores(medianAuthVector);

                const finalScore = calculateFinalScore(similarity, lengthVariation, intervalsWithinRange);
                const yScoreSum = yScores.reduce((sum, score) => sum + score, 0);

                setAuthResult({ finalScore, yScores, yScoreSum });

                setVectorLengthVariation(lengthVariation);
                setAuthAttempts([]);
            }

            setKeystrokeTimes([]);
            setLastTime(null);
        }
    };

    // New function to calculate the median of each interval
    const calculateMedianVector = (vectors) => {
        const vectorLength = vectors[0].length;
        const medianVector = new Array(vectorLength);

        for (let i = 0; i < vectorLength; i++) {
            const intervalValues = vectors.map(vector => vector[i]);
            intervalValues.sort((a, b) => a - b);

            const middle = Math.floor(intervalValues.length / 2);
            if (intervalValues.length % 2 === 0) {
                // Average of two middle values
                medianVector[i] = (intervalValues[middle - 1] + intervalValues[middle]) / 2;
            } else {
                medianVector[i] = intervalValues[middle];
            }
        }

        return medianVector;
    };

    const calculateLengthVariation = (vecA, vecB) => {
        const lengthA = vecA.reduce((sum, val) => sum + val, 0);
        const lengthB = vecB.reduce((sum, val) => sum + val, 0);
        return ((Math.abs(lengthA - lengthB) / lengthA) * 100).toFixed(2);
    };

    const calculateStandardDeviation = (vectors) => {
        const stdDevs = vectors[0].map((_, index) => {
            const valuesAtIndex = vectors.map((vector) => vector[index]);
            const mean = valuesAtIndex.reduce((sum, val) => sum + val, 0) / valuesAtIndex.length;
            const variance = valuesAtIndex.reduce((sum, val) => sum + (val - mean) ** 2, 0) / valuesAtIndex.length;
            return Math.sqrt(variance);
        });
        return stdDevs;
    };

    const cosineSimilarity = (vecA, vecB) => {
        const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val ** 2, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val ** 2, 0));

        return dotProduct / (magnitudeA * magnitudeB);
    };

    const calculateIntervalsWithinRange = (authVector) => {
        const stdDevRangeCount = stdDevs.reduce((count, stdDev, index) => {
            const lowerBound = medianVector[index] - stdDev;
            const upperBound = medianVector[index] + stdDev;
            const currentValue = authVector[index] || 0;
            if (currentValue >= lowerBound && currentValue <= upperBound) {
                count++;
            }
            return count;
        }, 0);
        return stdDevRangeCount / stdDevs.length;
    };

    const calculateYScores = (authVector) => {
        return authVector.map((value, index) => {
            const stdDev = stdDevs[index];
            const median = medianVector[index];
            const difference = Math.abs(value - median);
            return difference <= stdDev ? 1 : stdDev / difference;
        });
    };

    const calculateFinalScore = (similarity, lengthVariation, intervalsWithinRange) => {
        const similarityScore = similarity;
        const lengthVariationScore = 1 - lengthVariation / 100;
        const intervalScore = intervalsWithinRange;
        return (similarityScore + lengthVariationScore + intervalScore) / 3;
    };

    return (
        <div className="app-container">
            <h1 className="app-title">Keystroke Dynamics Authentication</h1>

            <div className="registration-section">
                <h2>Step 1: Registration</h2>
                <p>Type the text: "{targetText}" (5 times)</p>
                <input
                    className="text-input"
                    type="text"
                    onKeyPress={(e) => handleKeyPress(e)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setKeystrokeTimes([]);
                            setLastTime(null);
                        }
                    }}
                    onChange={(e) => {
                        e.target.value = handleRegistrationChange(e.target.value);
                        if (e.target.value === targetText) {
                            handleRegistrationSubmit(e.target.value);
                            e.target.value = "";
                        }
                    }}
                />
                <p>Registered Samples: {registrationVectors.length} / 5</p>

                {medianVector && (
                    <div className="average-vector-section">
                        <h3>Median Vector</h3>
                        <table className="vector-table">
                            <thead>
                                <tr>
                                    {medianVector.map((_, index) => (
                                        <th key={index}>Interval {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {medianVector.map((value, index) => (
                                        <td key={index}>{value.toFixed(2)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        <h3>Standard Deviation Ranges</h3>
                        <table className="vector-table">
                            <thead>
                                <tr>
                                    {stdDevs.map((_, index) => (
                                        <th key={index}>Interval {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {stdDevs.map((stdDev, index) => (
                                        <td key={index}>{stdDev.toFixed(2)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="authentication-section">
                <h2>Step 2: Authentication</h2>
                <p>Type the text: "{targetText}" (3 attempts)</p>
                <input
                    className="text-input"
                    type="text"
                    value={authInput}
                    onKeyPress={(e) => handleKeyPress(e, true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setKeystrokeTimes([]);
                            setLastTime(null);
                        }
                    }}
                    onChange={(e) => {
                        handleAuthChange(e.target.value);
                        if (e.target.value === targetText) {
                            handleAuthSubmit(e.target.value);
                            setAuthInput('');
                        }
                    }}
                />
                <p>Authentication Attempts: {authAttempts.length} / 3</p>

                {authResult !== null && (
                    <div className="auth-result-section">
                        <h3>Authentication Result</h3>
                        <p>Final Score: {authResult.finalScore.toFixed(2)}</p>
                        <p>Sum of Y-Scores: {authResult.yScoreSum.toFixed(2)}</p>
                        <p>Vector Length Variation: {vectorLengthVariation}%</p>
                        <h3>Y-Scores</h3>
                        <table className="vector-table">
                            <thead>
                                <tr>
                                    {authResult.yScores.map((_, index) => (
                                        <th key={index}>Interval {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {authResult.yScores.map((yScore, index) => (
                                        <td key={index}>{yScore.toFixed(2)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KeystrokeAuthApp;
