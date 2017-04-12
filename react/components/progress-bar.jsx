/* global $ */
import React from 'react';
import PropTypes from 'prop-types';

class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.followMouse = this.followMouse.bind(this);
    this.clearGuide = this.clearGuide.bind(this);
    this.seekTo = this.seekTo.bind(this);
  }

  followMouse(e) {
    const seekerOffset = $(this.seekerBar).offset().left;
    const relativePosition = e.pageX - seekerOffset;

    $('.seeking-bar-guide').css('width', relativePosition);
  }

  clearGuide() {
    $('.seeking-bar-guide').css('width', 0);
  }

  seekTo(e) {
    const seekerOffset = $(this.seekerBar).offset().left;
    const relativePosition = e.pageX - seekerOffset;
    const percentage = relativePosition / ($(this.seekerBar).width());

    this.props.onSeekTo(percentage);
  }

  render() {
    return (<div className="seeking" onMouseMove={this.followMouse} onMouseLeave={this.clearGuide}>
      <div
        className="seeking-bar"
        ref={(element) => { this.seekerBar = element; }}
        onClick={this.seekTo}
      >
        <div className="seeking-bar-guide" />
        <div
          className="seeking-bar-meter"
          ref={(element) => { this.seeker = element; }}
          style={{ width: `${100 * this.props.percentage}%` }}
        />
      </div>
    </div>);
  }


}

ProgressBar.propTypes = {
  onSeekTo: PropTypes.func.isRequired,
  percentage: PropTypes.number.isRequired,
};

export default ProgressBar;
