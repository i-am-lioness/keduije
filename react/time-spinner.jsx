import React from 'react';
import PropTypes from 'prop-types';
import KeduIje from './keduije';

class TimeSpinner extends React.Component {
  constructor(props) {
    super(props);
    this.variableName = this.props.variableName;

    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
  }

  decrement() {
    this.props.decrement(this.variableName);
  }

  increment() {
    this.props.increment(this.variableName);
  }

  render() {
    const displayedTimeMark = KeduIje.convertToTime(this.props.seconds);
    return (<div className="spinner-container">
      <div className="label">{this.props.label}</div>
      <div className="inner-spinner">
        <span className="display segmentStart">{displayedTimeMark}</span>
        <a onClick={this.increment} tabIndex="-1" aria-hidden="true" className="spinner-button">
          <span className="glyphicon glyphicon-triangle-top" aria-hidden="true" />
        </a>
        <a onClick={this.decrement} tabIndex="-1" aria-hidden="true" className="spinner-button" style={{ top: '50%' }}>
          <span className="glyphicon glyphicon-triangle-bottom" aria-hidden="true" />
        </a>
      </div>
    </div>);
  }
}

TimeSpinner.propTypes = {
  variableName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  decrement: PropTypes.func.isRequired,
  increment: PropTypes.func.isRequired,
  seconds: PropTypes.number.isRequired,
};

export default TimeSpinner;

