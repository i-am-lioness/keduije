/* global $ */
import React from 'react';
import PropTypes from 'prop-types';
import TimeSpinner from './time-spinner';

class LyricEditor extends React.Component {
  constructor(props) {
    super(props);
    this.dialogWidth = 500;
    this.handleSubmit = this.handleSubmit.bind(this);
    this.calculateTail = this.calculateTail.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if ((!prevProps.editMode) && (this.props.editMode)) {
      $(this.lyricEditor).draggable();
    }
  }

  handleSubmit(event) {
    event.preventDefault(); // todo: stop submitting for additional buttons without appropriate type
    this.props.saveLyric();
  }

  calculateTail() {
    const tailWidth = 30;
    this.dialogWidth = $(this.lyricEditor).outerWidth() || this.dialogWidth || 500;
    const offset = this.dialogWidth * this.props.percentage;
    const rightX = offset;
    const leftX = offset + tailWidth;
    const bottomX = offset + 20;


    const points = `${leftX},0 ${rightX},0 ${bottomX},50`;

    return (points || '');
  }

  render() {
    const playSegmentButton = (<a
      id="playLyric"
      type="button"
      className=""
      title="play"
      onClick={this.props.playLyric}
    >
      <span className="glyphicon glyphicon-play" aria-hidden="true" />
    </a>);

    const btnText = (this.props.mode === 'add') ? 'Add' : 'Update';
    const originalText = this.props.originalText ?
      <div className="originalText">{this.props.originalText}</div> : null;
    const dialog = (<form id="lyricEditor" style={{ visibility: this.props.displayed ? 'visible' : 'hidden' }} ref={(el) => { this.lyricEditor = el; }} className="editor-bg-color kezie-editor" onSubmit={this.handleSubmit}>
      <div className="row">
        <div className="col-md-12">
          {originalText}
          <button onClick={this.props.onDelete} type="button" style={{ position: 'absolute' }}>Delete</button>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12 col-xs-10">
          <input
            id="lyric"
            className="editor-input"
            type="text"
            placeholder="Transcibe Lyrics..."
            value={this.props.value}
            onChange={this.props.handleChange}
          />
        </div>
        <div className="col-xs-2 visible-xs-block">
          {playSegmentButton}
        </div>
      </div>
      <div className="row">
        <span className="hidden-xs" style={{ float: 'right' }}>
          {playSegmentButton}
        </span>
        <div className="col-md-5 col-xs-6">
          <TimeSpinner
            className="col-md-5"
            id="start-spinner"
            variableName="segmentStart"
            label="From"
            seconds={this.props.segmentStart}
            increment={this.props.incrementTime}
            decrement={this.props.decrementTime}
          />
        </div>
        <div className="col-md-5 col-xs-6">
          <TimeSpinner
            className="col-md-5"
            id="end-spinner"
            variableName="segmentEnd"
            label="To"
            seconds={this.props.segmentEnd}
            increment={this.props.incrementTime}
            decrement={this.props.decrementTime}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-3 col-xs-5">
          <button
            id="cancel-dialog-btn"
            className="btn btn-default btn-lg"
            type="reset"
            onClick={this.props.close}
          >
            Cancel
          </button>
        </div>
        <div className="col-md-9 col-xs-7">
          <button
            id="save-lyric-btn"
            className="btn btn-default btn-lg"
            type="submit"
          >
            {btnText}
          </button>
        </div>
      </div>
      <svg id="tail">
        <polygon points={this.calculateTail()} className="editor-bg-color" />
      </svg></form>);

    return (<div>

      {this.props.editMode && dialog}
    </div>);
  }
}

LyricEditor.defaultProps = {
  originalText: '',
};

LyricEditor.propTypes = {
  percentage: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired,
  segmentStart: PropTypes.number.isRequired,
  segmentEnd: PropTypes.number.isRequired,
  incrementTime: PropTypes.func.isRequired,
  decrementTime: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  displayed: PropTypes.bool.isRequired,
  originalText: PropTypes.string,
  editMode: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
  saveLyric: PropTypes.func.isRequired,
  playLyric: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
};
export default LyricEditor;
