/* eslint-env mocha */
/* eslint-disable */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import MediaPlayer from '../react/components/media-player';
import KeduIjeMedia from '../react/keduije-media'
import sinon from 'sinon';

describe('<MediaPlayer />', () => {

   it('loads youtube iframe API', (done) => {

     const player = <MediaPlayer
      canEdit={false}
      src={"http://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://keduije1.herokuapp.com&playsinline=1&rel=0&controls=0"}
      mediaType={KeduIjeMedia.mediaTypes.VIDEO}
      mediaID={"58e638a2d300e060f9cdd6ca"}
      img={"https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1"}
      artist={"Luther"}
      title={"Ada"}
      slug={"Ada"}
    />;

    setTimeout(()=>{
      expect(window.onYouTubeIframeAPIReady.calledOnce).to.equal(true);
      //expect(MediaPlayer.prototype.onPlayerReady.calledOnce).to.equal(true);
      done();
    }, 600);

    sinon.spy(MediaPlayer.prototype, 'componentDidMount');
    sinon.spy(MediaPlayer.prototype, 'onPlayerReady');
    
    const wrapper = mount(player);
    sinon.spy(window, 'onYouTubeIframeAPIReady');

    expect(MediaPlayer.prototype.componentDidMount.calledOnce).to.equal(true);

  });

  it('displays correct artist name', () => {

    const wrapper = mount( <MediaPlayer
      canEdit={false}
      src={"http://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://keduije1.herokuapp.com&playsinline=1&rel=0&controls=0"}
      mediaType={1}
      mediaID={"58e638a2d300e060f9cdd6ca"}
      img={"https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1"}
      artist={"Luther"}
      title={"Ada"}
      slug={"Ada"}
    />);

    expect(wrapper.find('.song-info .title').text()).to.equal('Ada');
  });

});