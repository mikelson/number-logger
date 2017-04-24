//
// Copyright 2017 Peter Mikelsons
//
import update from 'immutability-helper';
import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    // List the names of any and all methods used in JSX callbacks where you want "this" to be defined.
    // https://facebook.github.io/react/docs/handling-events.html
    [
      'handleNewValueChange',
      'addNewValue',
    ].forEach(method => 
      this[method] = this[method].bind(this)
    );

    // Deserialize state from local storage?
    let state = localStorage.getItem("state");
    if (state) {
      try {
        state = JSON.parse(state);
        // Deserialize time strings as Dates
        function remapTime(entry) {
          entry.time = new Date(entry.time);
        }
        state.logs.forEach(log => 
          log.entries.forEach(remapTime)
        );
      } catch (e) {
        console.error(e);
        console.log(state);
        state = undefined;
      }
    }
    // If state was deserialized OK, use it, otherwise initialize a new state.
    // Each browser stores an array of "Logs". (Array means Logs can have duplicate
    // names, don't need unique ID keys, and can be ordered. If these requirements
    // come into focus, another structure, like a dictionary, might make more sense.)
    // Each Log has an an array of "Entries". Entries are ordered by time, so
    // using an array makes sense. Each Entry has a time stamp and a number value.
    this.state = state || {
      // Current value of the numeric input field
      newValue: "",
      logs: [
        {
          name: "initial log",
          units: "#",
          entries: [
            // {
            //   time: new Date(1492838466707),
            //   value: 1
            // },
          ]
        }
      ]
    }
  }
  // Value input mutator - https://facebook.github.io/react/docs/forms.html
  handleNewValueChange(e) {
    this.setState({newValue: e.target.value});
  }
  // "Add" button click handler
  addNewValue() {
    // Validate the input, in case browser somehow let a non-number through.
    const value = parseFloat(this.state.newValue);
    if (isNaN(value)) {
      console.warn(value + " is not a number, not logging");
      return;
    }
    this.setState(update(this.state, {
      // Clear input, so user doesn't have to manually delete old value.
      newValue: {$set: ""},      
      logs: {
        // Currently just using one Log...
        0: {
          entries: {
            // Push a new Entry to the Log.
            $push: [{
              time: new Date(),
              value
            }]
          }
        }
      }
    }), function() {
      // After updating Log, serialize and persist to local storage.
      try {
        const json = JSON.stringify(this.state);
        localStorage.setItem("state", json);
      } catch (e) {
        console.error(e);
      }
    });
  }
  render() {
    // Currently just using one Log...
    const log = this.state.logs[0];
    // Create each row of the table
    const entries = log.entries.map(e => (
      <tr key={e.time.getTime()}>
        <td>
          {e.time.toLocaleDateString()}
        </td>
        <td>
          {e.time.toLocaleTimeString()}
        </td>
        <td>
          {e.value}
        </td>
      </tr>
    ));
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to Number Logger</h2>
        </div>
        <div>
          <div className="App-intro">
            Log: "{log.name}"
          </div>
          {entries.length > 0 &&
            <table>
              <tbody>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>{log.units}</th>
                </tr>
                {entries}
              </tbody>
            </table>
          }
          <label>
            Add a Number:
            <input
              type="number"
              inputMode="numeric"
              value={this.state.newValue}
              onChange={this.handleNewValueChange}
              ref={input => input && input.focus()} 
              autoFocus
              />
            <button
              disabled={!this.state.newValue} 
              onClick={this.addNewValue}>
              Add
            </button>
          </label>
        </div>
      </div>
    );
  }
}

export default App;
