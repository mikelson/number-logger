//
// Copyright 2017 Peter Mikelsons
//
import update from 'immutability-helper';
import React, { Component } from 'react';
import {
  PageHeader,
  Button,
  Table,
  Grid,
  Row,
  Col,
  Modal,
} from 'react-bootstrap';
import './App.css';

const defaultUnits = "#";

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
      'handleNewLogNameChange',
      'handleNewLogNameKeyDown',
      'renameCurrentLog',
      'showModalRenameCurrentLog',
      'hideModalRenameCurrentLog',
      'showModalDeleteCurrentLog',
      'hideModalDeleteCurrentLog',
      'exportCurrentLog',
      'chooseAndImportFile',
      'handleFileImport',
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
          units: defaultUnits,
          entries: [
            // {
            //   time: new Date(1492838466707),
            //   value: 1
            // },
          ]
        }
      ]
    };
      // Which modal popup dialogs are visible?
    // eslint-disable-next-line
    this.state.isShowingModal = {
      deleteCurrentLog: false,
      renameCurrentLog: false,
    };
    // Current value of new Log name field
    // eslint-disable-next-line
    this.state.newLogName = "";
  }
  // Only serialize state we want to persist, not emphemeral stuff like modals
  filterTransientUiState(key, value) {
    if (key === 'isShowingModal' ||
        key === 'newLogName') {
      return undefined;
    }
    return value;
  }
  // Override setState to persist whenever state changes
  setState(newState, callback) {
    super.setState(newState, function() {
      callback && callback();
      // After updating state, serialize and persist to local storage.
      try {
        const json = JSON.stringify(this.state, this.filterTransientUiState);
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
    this.setState(newState => update(newState, {
      currentLogIndex: {$set: newState.logs.length},
      logs: {$push: [{
        name: "unnamed",
        units: defaultUnits,
        entries: [],
      }]}
    }));    
  }
  // Main "Rename" button click handler
  showModalRenameCurrentLog() {
    this.setState(newState => {
      const log = newState.logs[newState.currentLogIndex];
      if (log) {
        // something valid currently selected
        return update(newState, {
          // Initialize the name buffer to the old name
          newLogName: {$set: log.name},
          isShowingModal: {renameCurrentLog: {$set: true}}
        });
      }
      return newState;
    });
  }
  // Handler for hiding "Rename Log" modal
  hideModalRenameCurrentLog() {
    this.setState(update(this.state, {
      newLogName: {$set: ""},
      isShowingModal: {renameCurrentLog: {$set: false}}
    }));
  }
  // Value input mutator - https://facebook.github.io/react/docs/forms.html
  handleNewLogNameChange(e) {
    this.setState({newLogName: e.target.value});
  }
  handleNewLogNameKeyDown(e) {
    if (e.keyCode === 13) {
      this.renameCurrentLog();
    };
  }
  // Modal are-you-sure "Rename" button click handler
  renameCurrentLog() {
    if (this.state.currentLogIndex >= this.state.logs.length) {
      // nothing valid currently selected
      return;
    }
    var name = this.state.newLogName;
    name = name && name.trim();
    if (!name) {
      this.hideModalRenameCurrentLog();
      return;
    }
    this.setState(update(this.state, {
      isShowingModal: {renameCurrentLog: {$set: false}},
      newLogName: {$set: ""},
      logs: {
        [this.state.currentLogIndex]: {
          name: {$set: name}
        }
      }
    }));
  }
  setShowingModalDeleteCurrentLog(value) {
      this.setState(update(this.state, {isShowingModal: {deleteCurrentLog: {$set: value}}}));
  }
  // Main "Delete" button click handler
  showModalDeleteCurrentLog() {
    if (this.state.currentLogIndex < this.state.logs.length) {
      // something valid currently selected
      this.setShowingModalDeleteCurrentLog(true);
    }
  }
  // Handler for hiding "Delete Log" modal
  hideModalDeleteCurrentLog() {
    this.setShowingModalDeleteCurrentLog(false);
  }
  // Modal are-you-sure "Delete" button click handler
  deleteCurrentLog() {
    if (this.state.currentLogIndex >= this.state.logs.length) {
      // sanity check, should not happen
      return;
    }
    // Select the next or last Log.
    const newIndex = Math.min(this.state.currentLogIndex, this.state.logs.length - 2);
    this.setState(update(this.state, {
      // Hide the modal
      isShowingModal: {deleteCurrentLog: {$set: false}},
      // Update the selected Log
      currentLogIndex: {$set: newIndex},
      // Actually remove the Log from the logs array
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
  // Export the current Log as a TSV
  exportCurrentLog() {
    const log = this.state.logs[this.state.currentLogIndex];
    if (!log) {
      return;
    }
    // Make a string to write to the file. Just using newlines for line
    // breaks, even though this might be downloaded to Windows...
    const lineBreak = navigator.platform.startsWith("Win") ? "\r\n" : "\n";
    const text = log.entries
      .map(e => `${e.time.toJSON()}\t${e.value}`)
      .reduce((prev, curr) => prev + curr + lineBreak, "");
    // Make a file name that might allow reconstructing the Log "metadata".
    const filename = `${log.name}-${log.units}.tsv`;

    // Make hidden something with "download" attribute, force a click on it, and remove it.
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' 
      + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  // Start the callback chain to import a local file.
  chooseAndImportFile() {
    // Create a hidden <input type="file"/>, force a click on it, and remove it.
    // That way the screen verbiage associated with the file picking is cleaned up.
    var element = document.createElement('input');
    element.setAttribute('type', 'file');
    element.onchange = this.handleFileImport;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  // Read the first file from the event target and import it.
  handleFileImport(e) {
    const context = this;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function(evt) {
      // File loaded... parse it as TSV <Date>\t<Number>\n
      const entries = evt.target.result
        .split("\n")
        .map(row => row.split("\t"))
        .map(cells => ({
          time: new Date(cells[0]), 
          value: parseInt(cells[1], 10)
        }))
        .filter(e => !isNaN(e.time.valueOf()) && !isNaN(e.value));
      // Parse Log metadata from file name, expected format <name>-<units>.tsv
      const name = file.name.match(/^[^-.]+/)[0] || file.name;
      let units = file.name.match(/-([^.]+)/);
      units = (units && units[1]) || defaultUnits;
      // Add the new log and set it to be current.
      context.setState(newState => update(newState, {
        currentLogIndex: {$set: newState.logs.length},
        logs: {$push: [{name, units, entries}]}
      }));
    };
  }
  render() {
    // Make all the <option>s for the Log dropdown <select>.
    const logs = this.state.logs.map((log, index) => (
      <option value={index} key={index}>
        {log.name}
      </option>
    ));

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
        <PageHeader>
          <small>Welcome to Number Logger</small>
        </PageHeader>
        <div className="Row">
          <Button
            onClick={this.addLog}
            >
            Add a new Log
          </Button>
          <Button 
            onClick={this.chooseAndImportFile} 
            title="Choose a file of tab-separated values to add as a new Log"
            bsStyle='link'
            >
            Import...
          </Button>
        </div>
        {this.state.logs.length > 0 &&
          <label className="Row">
            Choose Log:
            <select
              value={this.state.currentLogIndex}
              onChange={this.handleLogChange}
              className="LogSelect"
              >
              {logs}
            </select>
          </label>
        }
        {log &&
          <div className="Row">
            <Button
              onClick={this.showModalRenameCurrentLog}
              title="Change the name of this Log"
              >
              Rename...
            </Button>
            {' '}
            <Button
              onClick={this.showModalDeleteCurrentLog}
              title="Remove this Log"
              bsStyle="warning"
              >
              Delete...
            </Button>
            <Button
              onClick={this.exportCurrentLog}
              title="Save this Log as a file of tab-separated values"
              bsStyle="link"
              >
              Export
            </Button>
          </div>
        }
        {entries && entries.length > 0 &&
          <Grid>
            <Row>
              <Col>
                <Table responsive bordered>
                  <tbody>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>{log.units}</th>
                    </tr>
                    {entries}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Grid>
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
            {' '}
            <Button
              disabled={!this.state.newValue} 
              onClick={this.addNewValue}
              bsStyle="primary"
              >
              Add
            </Button>
          </label>
        }
        {log &&
          <Modal
            show={this.state.isShowingModal.deleteCurrentLog}
            onHide={this.hideModalDeleteCurrentLog}
            >
            <Modal.Header closeButton>
              <Modal.Title>Delete Log?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Are you sure you want to delete Log "{log.name}"? This action cannot be undone.
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.deleteCurrentLog}>Delete</Button>
              <Button onClick={this.hideModalDeleteCurrentLog} autoFocus>Cancel</Button>
            </Modal.Footer>
          </Modal>
        }
        {log &&
          <Modal
            show={this.state.isShowingModal.renameCurrentLog}
            onHide={this.hideModalRenameCurrentLog}
            >
            <Modal.Header closeButton>
              <Modal.Title>Rename Log</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              The old Log name is "{log.name}". Enter your new Log name here: 
              <input
                type="text"
                value={this.state.newLogName}
                onChange={this.handleNewLogNameChange}
                onKeyDown={this.handleNewLogNameKeyDown}
                ref={input => input && input.focus()} 
                autoFocus
                />
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.renameCurrentLog}>Apply</Button>
              <Button onClick={this.hideModalRenameCurrentLog}>Cancel</Button>
            </Modal.Footer>
          </Modal>
        }
      </div> // App
    );
  }
}

export default App;
