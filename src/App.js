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
      'handleLogChange',
      'addLog',
      'deleteCurrentLog',
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
        // Migrate old states with fields added later.
        state.currentLogIndex |= 0;
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
      // Which Log is currently displayed
      currentLogIndex: 0,
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
  // Override setState to persist whenever state changes
  setState(newState, callback) {
    super.setState(newState, function() {
      callback && callback();
      // After updating Log, serialize and persist to local storage.
      try {
        const json = JSON.stringify(this.state);
        localStorage.setItem("state", json);
      } catch (e) {
        console.error(e);
      }
    })
  }
  // Value input mutator - https://facebook.github.io/react/docs/forms.html
  handleNewValueChange(e) {
    this.setState({newValue: e.target.value});
  }
  // Log <select> dropdown change handler
  handleLogChange(e) {
    const newIndex = parseInt(e.target.value, 10);
    if (newIndex < this.state.logs.length) {
      // Inside current range: select old Log.
      this.setState({currentLogIndex: newIndex});
    } else {
      // Outside current range
      this.addLog();
    }
  }
  // Create a new Log and make it current
  addLog() {
    this.setState(update(this.state, {
      currentLogIndex: {$set: this.state.logs.length},
      logs: {$push: [{
        name: "unnamed",
        units: "#",
        entries: [],
      }]}
    }));    
  }
  // "Delete" button click handler
  deleteCurrentLog() {
    if (this.state.currentLogIndex >= this.state.logs.length) {
      // nothing valid currently selected
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Log "${this.state.logs[this.state.currentLogIndex].name}"? This action cannot be undone.`)) {
      return;
    }
    // Select the next or last Log.
    const newIndex = Math.min(this.state.currentLogIndex, this.state.logs.length - 2);
    this.setState(update(this.state, {
      currentLogIndex: {$set: newIndex},
      logs: {$splice: [[this.state.currentLogIndex, 1]]}
    }));
  }
  // "Add" button click handler
  addNewValue() {
    // Validate the input, in case browser somehow let a non-number through.
    const value = parseFloat(this.state.newValue);
    if (isNaN(value)) {
      console.warn(value + " is not a number, not logging");
      return;
    }
    if (this.state.currentLogIndex >= this.state.logs.length) {
      return;
    }
    this.setState(update(this.state, {
      // Clear input, so user doesn't have to manually delete old value.
      newValue: {$set: ""},
      logs: {
        [this.state.currentLogIndex]: {
          entries: {
            // Push a new Entry to the Log.
            $push: [{
              time: new Date(),
              value
            }]
          }
        }
      }
    }));
  }
  render() {
    // Make all the <option>s for the Log dropdown <select>.
    const logs = this.state.logs.map((log, index) => (
      <option value={index} key={index}>
        {log.name}
      </option>
    ));
    // Plus one more to make a new Log...
    logs.push(
      <option value={logs.length} key={logs.length}>
        (Add a new Log...)
      </option>
    );

    const log = this.state.logs[this.state.currentLogIndex];
    // Create each row of the table
    const entries = log && log.entries.map(e => (
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
            {
              this.state.logs.length ?
                <div>
                  <label>
                    Current Log:
                    <select
                      value={this.state.currentLogIndex}
                      onChange={this.handleLogChange}
                      >
                      {logs}
                    </select>
                  </label>
                  <button
                    onClick={this.deleteCurrentLog}
                    title="Remove this Log"
                    disabled={!log}
                    >
                    Delete
                  </button>
                </div>
                :
                <button
                  onClick={this.addLog}
                  >
                  Add a new Log
                </button>
            }
          </div>
          {entries && entries.length > 0 &&
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
          {log &&
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
          }
        </div>
      </div>
    );
  }
}

export default App;
