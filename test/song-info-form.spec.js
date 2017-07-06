/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import SongInfoForm from '../react/components/song-info-form';
import { processed as imageData, token as spotifyToken } from './utils/data/spotifyData';
import { data as ytData } from './utils/data/youtube-data';
import { mediaTypes } from '../react/keduije-media';
import { KeduIje } from './utils/mocks';

const searchImageFunc = sinon.stub();
const getYTdata = sinon.stub();

let revertSearchImages;
let revertGetYTdata;
let revertKeduije;

describe('<SongInfoForm />', function () {
  before(() => {
    revertSearchImages = SongInfoForm.__Rewire__('searchImages', searchImageFunc);
    revertGetYTdata = SongInfoForm.__Rewire__('getYTdata', getYTdata);
    revertKeduije = SongInfoForm.__Rewire__('KeduIje', KeduIje);
  });

  after(() => {
    revertSearchImages();
    revertGetYTdata();
    revertKeduije();
  });

  describe('image search', function () {
    let wrap;
    const submitSongInfo = sinon.spy();
    const deleteSong = sinon.spy();

    const event = {
      target: { name: 'artist', value: 'PSquare' },
      preventDefault: () => undefined,
    };

    const editorClass = (<SongInfoForm
      newSong
      onSubmit={submitSongInfo}
      onCancel={() => { deleteSong(null); }}
    />);

    before(function () {
      wrap = mount(editorClass);
    });

    it('should fetch token on load', function () {
      expect(KeduIje.getSpotifyToken.called).to.be.true;
      expect(wrap.instance().spotifyToken).to.equal(spotifyToken);
    });

    it('generates image results from artist', function (done) {
      searchImageFunc.resolves(imageData);
      const processResultsFunc = sinon.spy(wrap.instance(), 'storeImageResults');

      wrap.find('#artist-input').at(0).simulate('blur', event);

      expect(searchImageFunc.calledOnce).to.be.true;
      debugger;
      expect(searchImageFunc.lastCall.calledWith(event.target.value, spotifyToken)).to.be.true;
      setTimeout(() => {
        expect(processResultsFunc.called).to.be.true;
        expect(processResultsFunc.calledWith(imageData)).to.be.true;
        expect(wrap.find('.thumbnail')).to.have.length.above(1);
        done();
      }, 50);
    });
  });

  describe('updating new media: ', function () {
    const saveSongInfo = sinon.spy();
    const toggleSongInfoDialog = sinon.spy();
    const deleteThisSong = sinon.spy();

    const originalTitle = 'Humble';
    const originalArtist = 'Kendrick Lamar';

    const event = {
      target: { name: 'title', value: 'Ifunan' },
      preventDefault: () => undefined,
    };

    const editorClass = (<SongInfoForm
      onSubmit={saveSongInfo}
      title={originalTitle}
      artist={originalArtist}
      onCancel={(e) => { toggleSongInfoDialog(false, e); }}
      img={'http://042vibes.com/wp-content/uploads/2016/01/Zoro-Ogene-ft-flavour-Artwork.jpg'}
      onRemove={deleteThisSong}
    />);

    let wrap = null;
    const newArtistValue = 'PSquare';
    const newTitleValue = 'Ifun';

    before(function () {
      wrap = shallow(editorClass);
    });

    it('displays original values', function () {
      expect(wrap.find('#title-input').get(0).props.value).to.equal(originalTitle);
      expect(wrap.find('#artist-input').get(0).props.value).to.equal(originalArtist);
    });

    it('should not show src input for a song update', function () {
      expect(wrap.find('#src-input')).to.have.lengthOf(0);
    });

    it('displays new value as being edited, instead of original', function () {
      event.target.name = 'title';
      event.target.value = newTitleValue;

      wrap.find('#title-input').at(0).simulate('change', event);
      expect(wrap.find('#title-input').get(0).props.value).to.equal(newTitleValue);
      expect(wrap.find('#artist-input').get(0).props.value).to.equal(originalArtist);
    });

    it('generates image results from artist', function (done) {
      expect(wrap.find('.thumbnail')).to.have.lengthOf(1);

      searchImageFunc.resolves(imageData);
      const processResultsFunc = sinon.spy(wrap.instance(), 'storeImageResults');

      event.target.name = 'artist';
      event.target.value = newArtistValue;
      wrap.find('#artist-input').at(0).simulate('blur', event);

      expect(searchImageFunc.calledOnce).to.be.true;
      expect(searchImageFunc.lastCall.calledWith(newArtistValue)).to.be.true;
      setTimeout(() => {
        expect(processResultsFunc.called).to.be.true;
        expect(processResultsFunc.calledWith(imageData)).to.be.true;
        expect(wrap.find('.thumbnail')).to.have.length.above(1);
        done();
      }, 50);
    });

    it('only saves title, when title is only new value', function () {
      wrap.find('#new-song-form').simulate('submit', event);
      expect(saveSongInfo.calledOnce).to.be.true;
      expect(saveSongInfo.lastCall.calledWithExactly({ title: newTitleValue })).to.be.true;
    });

    it('only saves artist, when artist is only new value');

    it('generates image results from title');

    it('generates image results from both title and artist');

    it('stores image that user selected');

    it('only saves values that changed');
  });

  describe('creating new video listing: ', function () {
    const submitSongInfo = sinon.spy();
    const deleteSong = sinon.spy();

    const event = {
      target: { name: 'title', value: 'Ifunan' },
      preventDefault: () => undefined,
    };

    const editorClass = (<SongInfoForm
      newSong
      onSubmit={submitSongInfo}
      onCancel={() => { deleteSong(null); }}
    />);

    let wrap = null;
    const newTitleValue = 'Miracle Girl';
    const newUrl = 'https://www.youtube.com/watch?v=W5dkXGuR8Tk';

    before(function () {
      wrap = shallow(editorClass);
    });

    it('should show src input for fresh edit', function () {
      expect(wrap.find('#src-input')).to.have.lengthOf(1);
    });

    it('displays blank inputs', function () {
      expect(wrap.find('#title-input').get(0).props.value).to.be.empty;
      expect(wrap.find('#artist-input').get(0).props.value).to.be.empty;
      expect(wrap.find('#src-input').get(0).props.value).to.be.empty;
    });

    it('displays new src value as being edited, instead of blank', function () {
      const partialURL = 'www.who';
      event.target.name = 'src';
      event.target.value = partialURL;

      wrap.find('#src-input').at(0).simulate('change', event);
      expect(wrap.find('#src-input').get(0).props.value).to.equal(partialURL);
      expect(wrap.find('#artist-input').get(0).props.value).to.be.empty;
      expect(wrap.find('#title-input').get(0).props.value).to.be.empty;
    });

    it('finds video info from yt url', function (done) {
      expect(wrap.find('#video-id-input').get(0).props.value).to.be.empty;

      getYTdata.resolves(ytData.processedResponse);
      const displayVideoInfo = sinon.spy(wrap.instance(), 'displayVideoInfo');

      event.target.name = 'src';
      event.target.value = newUrl;
      wrap.find('#src-input').at(0).simulate('change', event);
      wrap.find('#src-input').at(0).simulate('blur', event);

      expect(getYTdata.called).to.be.true;
      expect(getYTdata.calledWith(newUrl)).to.be.true;
      setTimeout(() => {
        expect(displayVideoInfo.called).to.be.true;
        expect(displayVideoInfo.calledWith(ytData.processedResponse)).to.be.true;
        expect(wrap.find('#video-id-input').get(0).props.value).to.equal(ytData.videoID);
        expect(wrap.find('#title-input').get(0).props.value).to.be.equal(ytData.title);
        expect(wrap.find('#artist-input').get(0).props.value).to.be.empty;
        done();
      }, 50);
    });

    it('displays new value as being edited, instead of blank', function () {
      event.target.name = 'title';
      event.target.value = newTitleValue;

      expect(wrap.find('#title-input').get(0).props.value).to.be.equal(ytData.title);
      wrap.find('#title-input').at(0).simulate('change', event);
      expect(wrap.find('#title-input').get(0).props.value).to.equal(newTitleValue);
      expect(wrap.find('#artist-input').get(0).props.value).to.be.empty;
    });

    it('saves youtube thumbnail when image clicked', function () {
      wrap.find('#new-song-form').simulate('submit', event);
      expect(submitSongInfo.calledOnce).to.be.true;
      const expectedObj = {
        img: ytData.thumbnail,
        src: newUrl,
        title: newTitleValue,
        type: mediaTypes.VIDEO,
        videoID: ytData.videoID,
      };
      
      expect(submitSongInfo.lastCall.calledWithExactly(expectedObj)).to.be.true;
    });

    it('only saves artist, when artist is only new value');

    it('generates image results from title');

    it('generates image results from both title and artist');

    it('stores image that user selected');

    it('only saves values that changed');
  });

  describe('creating new audio listing: ', function () {
    const submitSongInfo = sinon.spy();
    const deleteSong = sinon.spy();

    const event = {
      target: { name: 'title', value: 'Ifunan' },
      preventDefault: () => undefined,
    };

    const editorClass = (<SongInfoForm
      newSong
      onSubmit={submitSongInfo}
      onCancel={() => { deleteSong(null); }}
    />);

    let wrap = null;
    const newTitleValue = 'Miracle Girl';
    const newUrl = 'https://song.mp3';

    before(function () {
      wrap = shallow(editorClass);
    });

    it('should not show artwork url input', function () {
      expect(wrap.find('#art-url-input').get(0).props.type).to.equal('hidden');
    });

    it('attemps to finds video info from yt url', function (done) {
      expect(wrap.find('#video-id-input').get(0).props.value).to.be.empty;

      getYTdata.rejects();

      event.target.name = 'src';
      event.target.value = newUrl;
      wrap.find('#src-input').at(0).simulate('change', event);
      wrap.find('#src-input').at(0).simulate('blur', event);

      expect(getYTdata.called).to.be.true;
      expect(getYTdata.calledWith(newUrl)).to.be.true;
      setTimeout(() => {
        expect(wrap.find('#art-url-input').get(0).props.type).to.be.null;
        expect(wrap.find('#video-id-input').get(0).props.value).to.be.empty;
        expect(wrap.find('#title-input').get(0).props.value).to.be.be.empty;
        expect(wrap.find('#artist-input').get(0).props.value).to.be.empty;
        done();
      }, 50);
    });

    it('does not query for empty input', function () {
      expect(wrap.find('.thumbnail')).to.have.lengthOf(0);

      event.target.name = 'artist';
      event.target.value = '';
      wrap.find('#artist-input').at(0).simulate('change', event);
      wrap.find('#artist-input').at(0).simulate('blur', event);
      expect(wrap.find('.thumbnail')).to.have.lengthOf(0);
    });

    it('generates image results from title', function (done) {
      expect(wrap.find('.thumbnail')).to.have.lengthOf(0);

      searchImageFunc.resolves(imageData);
      const storeImageResults = sinon.spy(wrap.instance(), 'storeImageResults');

      event.target.name = 'title';
      event.target.value = newTitleValue;
      wrap.find('#title-input').at(0).simulate('change', event);
      wrap.find('#title-input').at(0).simulate('blur', event);

      expect(searchImageFunc.called).to.be.true;
      expect(searchImageFunc.calledWith(newTitleValue)).to.be.true;
      setTimeout(() => {
        expect(storeImageResults.called).to.be.true;
        expect(storeImageResults.calledWith(imageData)).to.be.true;
        expect(wrap.find('.thumbnail')).to.have.length.above(0);
        done();
      }, 50);
    });

    it('allows user to select image', function () {
      expect(wrap.find('.selected')).to.have.lengthOf(0);

      wrap.find('.thumbnail').at(3).simulate('click');
      expect(wrap.instance().state.img).to.not.be.empty;
      // to do: need guarantee that image order is maintained
      expect(wrap.instance().state.img).to.equal(imageData[3]);
      expect(wrap.find('.selected')).to.have.lengthOf(1);
    });

    it('saves user typed artwork with submission', function () {
      wrap.find('#new-song-form').simulate('submit', event);
      expect(submitSongInfo.calledOnce).to.be.true;
      const expectedObj = {
        img: imageData[3],
        src: newUrl,
        title: newTitleValue,
        artist: '',
        type: mediaTypes.AUDIO,
      };
      expect(submitSongInfo.lastCall.calledWithExactly(expectedObj)).to.be.true;
    });

    it('handles empty yet "edited" values');
  });

  afterEach(function () {
    searchImageFunc.reset();
    getYTdata.reset();
  });
});
