import React from 'react';
import PropTypes from 'prop-types';

class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      guideWidth: 0,
    };

    this.followMouse = this.followMouse.bind(this);
    this.clearGuide = this.clearGuide.bind(this);
    this.seekTo = this.seekTo.bind(this);
  }

  followMouse(e) {
    const seekerOffset = this.seekerBar.getBoundingClientRect().left;
    const relativePosition = e.clientX - seekerOffset;
    this.setState({ guideWidth: relativePosition });
  }

  clearGuide() {
    this.setState({ guideWidth: 0 });
  }

  seekTo(e) {
    const seekerOffset = this.seekerBar.getBoundingClientRect().left;
    const relativePosition = e.clientX - seekerOffset;
    const percentage = relativePosition / this.seekerBar.offsetWidth;

    this.props.onSeekTo(percentage);
  }

  render() {
    const progressBarContainerStyle = {
      width: '100%',
      display: 'block',
      position: 'absolute',
      // bottom: 0,
      overflow: 'auto',
    };

    if (this.props.layout === 'top') {
      progressBarContainerStyle.top = 0;
    } else { // react props already ensures that only other value is 'bottom'
      progressBarContainerStyle.bottom = 0;
    }

    const progressBarStyle = {
      height: '10px',
      cursor: 'pointer',
      position: 'relative',
    };

    const progressBarGuideStyle = {
      margin: 0,
      padding: 0,
      width: this.state.guideWidth,
      height: '100%',
      position: 'absolute',
      top: 0,
      opacity: 0.5,
    };

    const progressBarMeterStyle = {
      margin: 0,
      padding: 0,
      width: '0%',
      height: '100%',
      opacity: '.7',
    };

    progressBarMeterStyle.width = `${100 * this.props.percentage}%`;

    return (<div
      className="seeking"
      style={progressBarContainerStyle}
      onMouseMove={this.followMouse}
      onMouseLeave={this.clearGuide}
    >
      <div
        className="seeking-bar"
        ref={(element) => { this.seekerBar = element; }}
        onClick={this.seekTo}
        style={progressBarStyle}
      >
        <div className="seeking-bar-guide" style={progressBarGuideStyle} />
        <div
          className="seeking-bar-meter"
          ref={(element) => { this.seeker = element; }}
          style={progressBarMeterStyle}
        />
      </div>
    </div>);
  }


}

ProgressBar.defaultProps = {
  layout: 'bottom',
};

ProgressBar.propTypes = {
  onSeekTo: PropTypes.func.isRequired,
  percentage: PropTypes.number.isRequired,
  layout: PropTypes.oneOf(['bottom', 'top']),
};

export default ProgressBar;
