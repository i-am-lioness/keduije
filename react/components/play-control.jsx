/* global $ */
import React from 'react';
import PropTypes from 'prop-types';

class PlayControl extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e) {
    $(e.currentTarget).blur();
    this.props.togglePlayState();
  }

  render() {
    return (<div
      type="button"
      aria-label="Left Align"
      className="play-button"
      onClick={this.handleClick}
    >
      <span
        className={`glyphicon glyphicon-${this.props.isPlaying ? 'pause' : 'play'}`}
        aria-hidden="true"
      />
    </div>);
  }

}

PlayControl.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  togglePlayState: PropTypes.func.isRequired,
};

export default PlayControl;
