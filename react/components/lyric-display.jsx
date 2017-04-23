/* eslint-env browser */
/* global $ */
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import PropTypes from 'prop-types';
import PencilIcon from './pencil-icon';
import { scrollIfOutOfView } from '../keduije-util';

class LyricDisplay extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hoveredIdx: -1,
      hoveredLinkIdx: -1,
    };

    this.eachLyric = this.eachLyric.bind(this);
    this.jumpTo = this.jumpTo.bind(this);
    this.hoverStart = this.hoverStart.bind(this);
    this.hoverEnd = this.hoverEnd.bind(this);
    this.editLyric = this.editLyric.bind(this);

    this.currentLine = null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.currentTime === this.props.currentTime) return;
    if (this.currentLine) {
      scrollIfOutOfView(this.currentLine);
    }
  }

  jumpTo(data, e) {
    e.preventDefault();
    const currentLine = e.currentTarget;
    $('.current').removeClass('current'); // may not be necessary if the sampling rate increases
    $(currentLine).addClass('current'); // may not be necessary if the sampling rate increases
    this.setState({ hoveredIdx: -1 }); // in case touch screen triggered hover setting
    const currentLineStartTime = parseInt(data.startTime, 10);
    const currentLineEndTime = parseInt(data.endTime, 10);
    this.props.jumpTo(currentLineStartTime, currentLineEndTime);
  }

  hoverStart(idx, e) {
    this.setState({ hoveredIdx: idx });
  }

  hoverEnd() {
    this.setState({ hoveredIdx: -1 });
  }

  showBtn(idx) {
    this.setState({ hoveredLinkIdx: idx });
  }
  hideBtn() {
    this.setState({ hoveredLinkIdx: -1 });
  }

  editLyric(data, index, forHeader, e) {
    e.stopPropagation();
    if ((this.state.hoveredIdx === index) && this.props.editMode) {
      if (forHeader) {
        this.props.showEditHeaderDialog(data);
      } else {
        this.props.showEditDialog(data);
      }
    }
  }

  eachLyric(ly, idx) {
    if (ly.heading) {
      return (<h4 key={ly.key} onMouseEnter={(e) => { this.hoverStart(idx, e); }}>
        {this.props.editMode && (<PencilIcon
          onClick={(e) => { this.editLyric(ly.data, idx, true, e); }}
          idx={idx}
          hoveredIdx={this.state.hoveredIdx}
        />)}
        {ly.heading}
      </h4>);
    }

    let pClass = 'lyric-line';
    let a = null;
    if (!ly.hasHeading) {
      a = (<a
        className="add-heading-btn"
        href="#"
        onMouseEnter={(e) => { this.showBtn(idx, e); }}
        onMouseLeave={(e) => { this.hideBtn(e); }}
        onClick={(e) => { this.editLyric(ly.data, idx, true, e); }}
        style={{ opacity: (this.props.editMode && (this.state.hoveredLinkIdx === idx)) ? 1 : 0 }}
      >
        <span className="glyphicon glyphicon-plus" aria-hidden="true" />
            Add Heading
          </a>);
    }

    let isTheCurrentLine = false;
    if (!this.props.editMode
      && (ly.startTime <= this.props.currentTime)
      && (this.props.currentTime <= ly.displayEndTime)) {
      pClass += (' current');
      isTheCurrentLine = true;
    }

    if (this.state.hoveredIdx === idx) {
      pClass += (' hovered');
    }

    return (<div
      className={pClass}
      key={ly.key}
      onClick={(e) => { this.jumpTo(ly.data, e); }}
      onMouseEnter={(e) => { this.hoverStart(idx, e); }}
      ref={(el) => { if (isTheCurrentLine) this.currentLine = el; }}
    >
      {this.props.editMode && a}
      <p>
        {this.props.editMode && (<PencilIcon
          onClick={(e) => { this.editLyric(ly.data, idx, false, e); }}
          idx={idx}
          hoveredIdx={this.state.hoveredIdx}
        />)}
        {ly.text}
      </p>
    </div>);
  }

  render() {
    const rows = [];
    let curr = null;
    let forDisplay = null;
    let rowDisplay = null;
    let subTitle = null;

    if (this.props.videoIsPlaying) {
      for (let i = 0; i < this.props.lyrics.length; i += 1) {
        curr = this.props.lyrics[i];
        const displayStartTime = curr.startTime;
        const displayEndTime
          = (this.props.lyrics[i + 1]) ? this.props.lyrics[i + 1].startTime - 1 : curr.endTime;
        if ((displayStartTime <= this.props.currentTime)
          && (this.props.currentTime <= displayEndTime)) {
          subTitle = <p className="subtitles" key={curr.id}>{curr.text}</p>;
          break;
        }
      }

      rowDisplay = (<ReactCSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={500}
        transitionLeaveTimeout={300}
      >
        {subTitle}
      </ReactCSSTransitionGroup>);
    } else {
      for (let i = 0; i < this.props.lyrics.length; i += 1) {
        curr = this.props.lyrics[i];
        delete curr.key;
        forDisplay = $.extend({ data: curr }, curr);
        if (curr.heading) {
          rows.push($.extend({ key: `${curr._id}-h`, data: curr }, curr));
          forDisplay.heading = null;
          forDisplay.hasHeading = true;
        }
        forDisplay.key = curr._id;
        forDisplay.displayEndTime
          = (this.props.lyrics[i + 1]) ? this.props.lyrics[i + 1].startTime - 1 : forDisplay.endTime;

        rows.push(forDisplay);
      }

      this.currentLine = null;
      rowDisplay = rows.map(this.eachLyric);
    }

    return (<div id="lyricsDisplay" onMouseLeave={this.hoverEnd}>
      {rowDisplay}
    </div>);
  }
}

LyricDisplay.propTypes = {
  currentTime: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,
  lyrics: PropTypes.arrayOf(PropTypes.object).isRequired,
  jumpTo: PropTypes.func.isRequired,
  showEditHeaderDialog: PropTypes.func.isRequired,
  showEditDialog: PropTypes.func.isRequired,
  videoIsPlaying: PropTypes.bool.isRequired,
};

export default LyricDisplay;
