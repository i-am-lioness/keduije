/* eslint-env browser */
import React from 'react';
import update from 'react-addons-update'; // todo: replace with https://github.com/kolodny/immutability-helper
import PropTypes from 'prop-types';
import KeduIje from '../keduije';
import { convertToTime } from '../keduije-util';
import { revisionTypes } from '../../lib/constants';

const JsDiff = require('diff');

const DEBUG = false;

const activityTypes = {
  UPDATE: 'update',
  LYRIC_DELETION: 'deletion',
  LYRIC_INSERT: 'add',
  MEDIA_REMOVAL: 'removal', // for media
  META: 'info',
};

function getDate(doc) {
  const timestamp = doc._id.toString().substring(0, 8);
  const date = new Date(parseInt(timestamp, 16) * 1000);
  return date;
}

function processActivity(el) {
  el.time = parseInt(el.original ? (el.original.startTime || -1) : el.startTime, 10);
  switch (el.type) {
    case revisionTypes.INFO_EDIT:
      if (el.newValues.status === 'deleted') {
        el.type = activityTypes.MEDIA_REMOVAL;
      } else {
        el.type = activityTypes.META;
      }
      break;
    case revisionTypes.LINE_ADD:
      el.type = activityTypes.LYRIC_INSERT;
      break;
    case revisionTypes.LINE_EDIT:
      if (('deleted' in el.newValues) && JSON.parse(el.newValues.deleted)) {
        el.type = activityTypes.LYRIC_DELETION;
      } else {
        el.type = activityTypes.UDPATE;
      }
      break;
    default:
  }
  // todo: for now treat lyric recoveries like brand new adds
}

function eachDiff(diff, i) {
  let className = null;
  if (diff.added) {
    className = 'added';
  } else if (diff.removed) {
    className = 'removed';
  }

  return <span className={className} key={i}>{diff.value}</span>;
}

function changedInfo(name, edit) {
  return (<p>
    {name}:
    {edit.original[name]}
    <span className="glyphicon glyphicon-arrow-right" aria-hidden="true" />
    {edit.newValues[name]}
  </p>);
}

function changedTimeMark(label, edit, field, timeUrl) {
  if (edit.newValues[field]) {
    const formatedTimeOld = convertToTime(edit.original[field]);
    const formatedTimeNew = convertToTime(edit.newValues[field]);
    return (<p className="changed-time">
      {label}
      <a href={timeUrl}>({formatedTimeOld})</a>
      <span className="glyphicon glyphicon-arrow-right" aria-hidden="true" />
      <a href={timeUrl}>({formatedTimeNew})</a>
    </p>);
  }
  return null;
}

function renderActivity(songUrl, edit) {
  let output = null;
  const startTime = convertToTime(edit.time);

  if (edit.type === activityTypes.UDPATE) {
    let textChange = null;
    let startTimeChange = null;
    let endTimeChange = null;
    if (edit.newValues.text) { // if a line edit
      const diff = JsDiff.diffChars(edit.original.text, edit.newValues.text);
      const changes = diff.map(eachDiff);
      textChange = (<p>
        <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
        <span className="glyphicon glyphicon-pencil" aria-hidden="true" />
        <strong>{changes}</strong>
      </p>);
    }

    if ((edit.newValues.startTime) && (edit.newValues.startTime !== edit.original.startTime)) { // to do: render this unnecessary
      startTimeChange = changedTimeMark('Start :', edit, 'startTime', `${songUrl}#${edit.time}`);
    }
    if ((edit.newValues.endTime) && (edit.newValues.endTime !== edit.original.endTime)) {
      endTimeChange = changedTimeMark('End :', edit, 'endTime', `${songUrl}#${edit.time}`);
    }

    output = (<span data-id={edit._id}>
      {textChange}
      {startTimeChange}
      {endTimeChange}
    </span>);
  } else if (edit.type === activityTypes.LYRIC_DELETION) { // if a deletion
    output = (<p className="deleted-line">
      <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
      <span className="glyphicon glyphicon-trash" aria-hidden="true" />
      <strong >{edit.original.text}</strong>
    </p>);
  } else if (edit.type === activityTypes.META) { // if an info edit
    let textOutput = null;
    let artistOutput = null;
    let imgOutput = null;
    if (edit.newValues.title) {
      textOutput = changedInfo('title', edit);
    }

    if (edit.newValues.artist) {
      artistOutput = changedInfo('artist', edit);
    }

    if (edit.newValues.img) {
      imgOutput = <p>changed art work</p>;
    }

    output = <span>{textOutput} {artistOutput} {imgOutput}</span>;
  } else if (edit.type === activityTypes.LYRIC_INSERT) {
    output = (<p>
      <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
      <span className="glyphicon glyphicon-plus" aria-hidden="true" />
      <strong>{edit.text}</strong>
    </p>);
  } else { // if (edit.type === activityTypes.MEDIA_REMOVAL) {
    // todo: should have own panel
    output = (<p>
      Removed this song
    </p>);
  }

  return (<li className="list-group-item" key={edit._id}>
    {output}
    {DEBUG && <pre>{JSON.stringify(edit)}</pre>}
  </li>);
}


class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      changesets: [],
      showMoreBtn: true,
      media: {},
    };

    this.setChangesets = this.setChangesets.bind(this);
    this.renderChangeset = this.renderChangeset.bind(this);
    this.processChangeset = this.processChangeset.bind(this);
    this.renderChanges = this.renderChanges.bind(this);
    this.loadMoreChangesets = this.loadMoreChangesets.bind(this);
    this.storeMediaInfo = this.storeMediaInfo.bind(this);

    this.lastChangesetID = null;

    this.query = {};

    if (this.props.mediaID) {
      this.query.mediaID = this.props.mediaID;
    } else {
      this.query.userID = this.props.userID;
    }
  }

  componentWillMount() {
    KeduIje.getChangesets(this.query).then(this.setChangesets);
  }

  loadMoreChangesets() {
    this.query.fromID = this.lastChangesetID;
    KeduIje.getChangesets(this.query).then(this.setChangesets);
  }

  setChangesets(sessions) {
    if (sessions.length < 10) {
      this.setState({ showMoreBtn: false });
    }

    let changesets = sessions;
    changesets.forEach(this.processChangeset);
    changesets = sessions.filter(el => !el.empty);
    changesets.sort((a, b) => (b.date - a.date));

    this.setState({ changesets: update(this.state.changesets, { $push: changesets }) });
  }

  storeMediaInfo(media) {
    this.setState({ media: update(this.state.media, { [media._id]: { $set: media } }) });
  }

  processChangeset(el) {
    el.date = getDate(el);
    el.empty = true;

    const changesetID = el._id;
    this.lastChangesetID = changesetID;

    if (!this.state.media.hasOwnProperty(el.media)) {
      KeduIje.getMediaInfo(el.media).then(this.storeMediaInfo);
    }

    if (el.type === 'new') {
      if (el.media) {
        el.empty = false;
      }
    } else {
      el.empty = (el.revisions.length === 0);
      el.changes = el.revisions;
      el.changes.forEach(processActivity);
      el.changes.sort((a, b) => (a.time - b.time));
      // TO DO: do not display rolledback changes
    }
  }

  renderChanges(changeset) {
    const editsHTML = changeset.changes.map(renderActivity.bind(this, changeset.songUrl));

    return <ul className="list-group">{editsHTML}</ul>;
  }

  renderChangeset(changeset) {
    const song = this.state.media[changeset.media]; // to do: check that it exists
    let songTitle = '';
    let songImg = ''; // to do: default image
    if (song) {
      changeset.songUrl = `/music/${song.slug}`;
      songTitle = <a className="song-title" href={changeset.songUrl}>{song.title}</a>;
      songImg = song.img;
    }
    let output = null;

    if (changeset.type === 'new') {
      output = (<div className="media">
        <div className="media-left">
          <a href={changeset.songUrl}>
            <img className="media-object" src={songImg} alt={songTitle} style={{ width: '200px' }} />
          </a>
        </div>
        <div className="media-body">
          <h4 className="media-heading">Added</h4>
          {DEBUG && <pre>{JSON.stringify(changeset)}</pre>}
        </div>
      </div>);
    } else {
      output = this.renderChanges(changeset);
    }


    return (<div
      className="panel panel-default"
      key={changeset._id}
    >
      <div className="panel-heading">
        {songTitle}
        <span className="label label-default">{changeset.date.toLocaleString()}</span>
      </div>
      <div className="panel-body">
        {output}
      </div>
    </div>);
  }

  render() {
    const activityDisplay = this.state.changesets.map(this.renderChangeset);

    return (<div className="">
      {activityDisplay}
      {this.state.showMoreBtn && <button onClick={this.loadMoreChangesets}> Load More </button>}
    </div>);
  }
}

Edits.defaultProps = {
  mediaID: null,
  userID: null,
};

Edits.propTypes = {
  mediaID: PropTypes.string,
  userID: PropTypes.string,
};

export default Edits;
