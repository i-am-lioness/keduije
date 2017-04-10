/* eslint-env browser */
/* global props */
import React from 'react';
import ReactDOM from 'react-dom';
import update from 'react-addons-update'; // todo: replace with https://github.com/kolodny/immutability-helper
import PropTypes from 'prop-types';
import KeduIje from './keduije';

const JsDiff = require('diff');

function processEdit(type, el) {
  el.type = type;

  if (type === 'edit') {
    if ('deleted' in el.newValues) {
      if ((el.newValues.deleted === true) || (el.newValues.deleted === 'true')) {
        el.type = 'deletion';
      } else { // todo: for now treat lyric recoveries like brand new adds
        el.type = 'add';
        el.text = el.newValues.text; // todo: should Object.assign()
      }
    } else if (el.target === 'media') { // todo: reorganize
      el.type = 'info';
      if (el.newValues.status === 'deleted') {
        el.type = 'removal'; // song deletion, todo: organize semantics
      }
    }
  }

  el.time = parseInt(el.original ? (el.original.startTime || -1) : el.startTime, 10);
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
    const formatedTimeOld = KeduIje.convertToTime(edit.original[field]);
    const formatedTimeNew = KeduIje.convertToTime(edit.newValues[field]);
    return (<p>
      {label}
      <a href={timeUrl}>({formatedTimeOld})</a>
      <span className="glyphicon glyphicon-arrow-right" aria-hidden="true" />
      <a href={timeUrl}>({formatedTimeNew})</a>
    </p>);
  }
  return null;
}

function eachEdit(songUrl, edit, idx) {
  let output = null;
  const startTime = KeduIje.convertToTime(edit.time);

  if (edit.type === 'edit') {
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

    if (edit.newValues.startTime) {
      startTimeChange = (<p>
        start time moved to <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
      </p>);
    }
    startTimeChange = changedTimeMark('Start :', edit, 'startTime', `${songUrl}#${edit.time}`);
    endTimeChange = changedTimeMark('End :', edit, 'endTime', `${songUrl}#${edit.time}`);

    output = (<span data-id={edit._id}>
      {textChange}
      {startTimeChange}
      {endTimeChange}
    </span>);
  } else if (edit.type === 'deletion') { // if a deletion
    output = (<p className="deleted-line">
      <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
      <span className="glyphicon glyphicon-trash" aria-hidden="true" />
      <strong >{edit.original.text}</strong>
    </p>);
  } else if (edit.type === 'info') { // if an info edit
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
  } else if (edit.type === 'add') {
    output = (<p>
      <a href={`${songUrl}#${edit.time}`}>({startTime})</a>
      <span className="glyphicon glyphicon-plus" aria-hidden="true" />
      <strong>{edit.text}</strong>
    </p>);
  } else if (edit.type === 'removal') { // todo: should have own panel
    output = (<p>
      Removed this song
    </p>);
  }

  const debug = false;
  return (<li className="list-group-item" key={edit._id}>
    {output}
    {debug && <pre>{JSON.stringify(edit)}</pre>}
  </li>);
}


class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      changesets: [],
      mediaByChangeset: {},
      mediaById: {},
      edits: {},
      adds: {},
      showMoreBtn: true,
    };

    this.setEdits = this.setEdits.bind(this);
    this.setAdds = this.setAdds.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.setChangesets = this.setChangesets.bind(this);
    this.eachChangeset = this.eachChangeset.bind(this);
    this.processSession = this.processSession.bind(this);
    this.listEdits = this.listEdits.bind(this);
    this.loadMoreChangesets = this.loadMoreChangesets.bind(this);

    this.lastChangesetID = null;

    this.query = {};

    if (this.props.media) {
      this.query.media = this.props.media;
    } else {
      this.query.user = this.props.byUser;
    }
  }

  componentWillMount() {
    KeduIje.getChangesets(this.setChangesets, this.query);
  }

  loadMoreChangesets() {
    this.query.from = this.lastChangesetID;
    KeduIje.getChangesets(this.setChangesets, this.query);
  }

  setChangesets(changesets) {
    changesets.forEach(this.processSession);
    changesets.sort((a, b) => (b.date - a.date));

    if (changesets.length < 10) {
      this.setState({ showMoreBtn: false });
    }

    this.setState({ changesets: update(this.state.changesets, { $push: changesets }) });
  }

  setEdits(changesetID, edits) {
    edits.forEach(processEdit.bind(this, 'edit'));
    edits.sort((a, b) => (b.date - a.date));

    const updateObj = {};
    updateObj[changesetID] = { $set: edits };
    this.setState({ edits: update(this.state.edits, updateObj) });
  }

  saveSongInfo(songInfo) {
    const updateObj = {};
    updateObj[songInfo._id] = { $set: songInfo };
    this.setState({ mediaById: update(this.state.mediaById, updateObj) });
  }

  setAdds(changesetID, adds) {
    adds.forEach(processEdit.bind(this, 'add'));
    adds.sort((a, b) => (b.date - a.date));

    const updateObj = {};
    updateObj[changesetID] = { $set: adds };
    this.setState({ adds: update(this.state.adds, updateObj) });
  }

  setListing(changesetID, media) { // todo, make more efficient
    const updateObj = {};
    updateObj[changesetID] = { $set: media };
    this.setState({ mediaByChangeset: update(this.state.mediaByChangeset, updateObj) });
  }

  processSession(el) {
    const timestamp = el._id.toString().substring(0, 8);
    const date = new Date(parseInt(timestamp, 16) * 1000);
    el.date = date;

    const changesetID = el._id;
    this.lastChangesetID = changesetID;

    if (el.type === 'new') {
      KeduIje.getMediaByChangeset(changesetID, this.setListing.bind(this, changesetID));
    } else {
      const mediaID = el.mediaID;

      if (!this.state.mediaById[mediaID]) {
        KeduIje.getMediaInfo(mediaID, this.saveSongInfo);
      }

      KeduIje.getRevisions(changesetID, this.setEdits.bind(this, changesetID));
      KeduIje.myLines(changesetID, this.setAdds.bind(this, changesetID));
    }
  }

  listEdits(changesetID, songUrl) {
    const edits = (this.state.adds[changesetID] || [])
      .concat((this.state.edits[changesetID] || []));
    edits.sort((a, b) => (a.time - b.time));

    const editsHTML = edits.map(eachEdit.bind(this, songUrl));

    return editsHTML.length ? <ul className="list-group">{editsHTML}</ul> : null;
  }

  eachChangeset(changeset, idx) {
    let song = null;
    let songUrl = null;
    let songTitle = null;
    let songImg = null;
    let output = null;

    if (changeset.type === 'new') {
      song = this.state.mediaByChangeset[changeset._id];

      if (song) {
        songUrl = `/music/${song.slug}`;
        songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
        songImg = song.img;


        output = (<div className="media">
          <div className="media-left">
            <a href={songUrl}>
              <img className="media-object" src={songImg} alt={songTitle} style={{ width: '200px' }} />
            </a>
          </div>
          <div className="media-body">
            <h4 className="media-heading">Added</h4>
            {true || <pre>{JSON.stringify(changeset)}</pre>}
          </div>
        </div>);
      }
    } else {
      song = this.state.mediaById[changeset.mediaID];
      if (song) {
        songUrl = `/music/${song.slug}`;
        songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
      }
      output = this.listEdits(changeset._id, songUrl);
    }


    return output ? <div
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
    </div> : null;
  }

  render() {
    const history = this.state.changesets.sort((a, b) => (b.date - a.date));
    const activityDisplay = history.map(this.eachChangeset);

    return (<div className="">
      {activityDisplay}
      {this.state.showMoreBtn && <button onClick={this.loadMoreChangesets}> Load More </button>}
    </div>);
  }
}

Edits.defaultProps = {
  media: null,
  byUser: null,
};

Edits.propTypes = {
  media: PropTypes.string,
  byUser: PropTypes.string,
};

ReactDOM.render(
  <Edits
    byUser={props.byUser}
    media={props.mediaID}
  />,
  document.getElementById('root')
);
