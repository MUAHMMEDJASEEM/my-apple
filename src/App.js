import React, { useState } from 'react';
import './App.css';

const KeystrokeAuthApp = () => {
    const [registrationVectors, setRegistrationVectors] = useState([]);
    const [averageVector, setAverageVector] = useState(null);
    const [keystrokeTimes, setKeystrokeTimes] = useState([]);
    const [lastTime, setLastTime] = useState(null);
    const [authResult, setAuthResult] = useState(null);
    const [authInput, setAuthInput] = useState('');
    const [vectorLengthVariation, setVectorLengthVariation] = useState(null);
    const [stdDevs, setStdDevs] = useState([]); // Store standard deviations
    const [currentInterval, setCurrentInterval] = useState(null); // Track current interval
    const [authAttempts, setAuthAttempts] = useState([]); // Store keystroke times for each auth attempt
    const targetText = "toothbrush apple";

    const handleKeyPress = (e, isAuth = false) => {
        const currentTime = Date.now();
        if (lastTime) {
            const timeDiff = currentTime - lastTime;
            if (!isAuth && keystrokeTimes.length < targetText.length - 1) {
                setKeystrokeTimes([...keystrokeTimes, timeDiff]);
            }
            if (isAuth && keystrokeTimes.length < targetText.length - 1) {
                setKeystrokeTimes([...keystrokeTimes, timeDiff]);
                setCurrentInterval(keystrokeTimes.length + 1); // Update the current interval
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
            const sumVector = registrationVectors.reduce((sum, vector) => {
                return sum.map((value, i) => value + vector[i]);
            }, new Array(targetText.length - 1).fill(0));

            const avgVector = sumVector.map((value) => value / 5);
            setAverageVector(avgVector);

            // Calculate standard deviations
            const calculatedStdDevs = calculateStandardDeviation(registrationVectors);
            setStdDevs(calculatedStdDevs);
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
            // Track the keystroke times for each authentication attempt
            setAuthAttempts([...authAttempts, keystrokeTimes]);

            // If 3 attempts have been made, calculate average keystroke time vector
            if (authAttempts.length + 1 === 3) {
                const avgAuthVector = calculateAverageVector(authAttempts);
                const similarity = cosineSimilarity(averageVector, avgAuthVector);
                const lengthVariation = calculateLengthVariation(averageVector, avgAuthVector);
                setAuthResult(similarity);
                setVectorLengthVariation(lengthVariation);
                setAuthAttempts([]); // Clear attempts after 3rd submission
            }

            setKeystrokeTimes([]);
            setLastTime(null);
        }
    };

    const calculateAverageVector = (attempts) => {
        const vectorLength = attempts[0].length;
        const avgVector = new Array(vectorLength).fill(0);

        attempts.forEach(attempt => {
            attempt.forEach((time, index) => {
                avgVector[index] += time;
            });
        });

        return avgVector.map(time => time / attempts.length); // Calculate average for each interval
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

    // Calculate the number of intervals within standard deviation range
    const calculateIntervalsWithinRange = (currentInterval) => {
        const stdDevRangeCount = stdDevs.reduce((count, stdDev, index) => {
            const lowerBound = averageVector[index] - stdDev;
            const upperBound = averageVector[index] + stdDev;
            const currentIntervalValue = keystrokeTimes[index] || 0; // Ensure the value exists
            if (currentIntervalValue >= lowerBound && currentIntervalValue <= upperBound) {
                count++;
            }
            return count;
        }, 0);
        return stdDevRangeCount;
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
                            e.target.value = ""; // Clear input after correct typing
                        }
                    }}
                />
                <p>Registered Samples: {registrationVectors.length} / 5</p>

                {averageVector && (
                    <div className="average-vector-section">
                        <h3>Average Vector</h3>
                        <table className="vector-table">
                            <thead>
                                <tr>
                                    {averageVector.map((_, index) => (
                                        <th key={index}>Interval {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {averageVector.map((value, index) => (
                                        <td key={index}>{value.toFixed(2)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        {/* Show the standard deviation ranges */}
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
                                    {stdDevs.map((stdDev, index) => {
                                        const lowerBound = (averageVector[index] - stdDev).toFixed(2);
                                        const upperBound = (averageVector[index] + stdDev).toFixed(2);
                                        return (
                                            <td key={index}>
                                                {lowerBound} - {upperBound}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {averageVector && (
                <div className="auth-section">
                    <h2>Step 2: Authentication</h2>
                    <p>Type the text: "{targetText}"</p>
                    <input
                        className="text-input"
                        type="text"
                        value={authInput}
                        onKeyPress={(e) => handleKeyPress(e, true)}
                        onChange={(e) => {
                            handleAuthChange(e.target.value);
                            if (e.target.value === targetText) {
                                handleAuthSubmit(e.target.value);
                                setAuthInput(''); // Clear input after correct typing
                            }
                        }}
                    />
                    {authResult && (
                        <div className="auth-results">
                            <p>Cosine Similarity: {authResult.toFixed(2)}</p>
                            <p>Vector Length Variation: {vectorLengthVariation}%</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default KeystrokeAuthApp;
