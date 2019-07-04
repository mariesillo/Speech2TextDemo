/* eslint no-param-reassign: 0 */
import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import {
  Icon, Tabs, Pane, Alert, Modal
} from 'watson-react-components';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';
import recognizeFile from 'watson-speech/speech-to-text/recognize-file';
import ModelDropdown from './model-dropdown.jsx';
import Transcript from './transcript.jsx';
import JSONView from './json-view.jsx';
import Email from './email.jsx';

import cachedModels from '../src/data/models.json';

const ERR_MIC_NARROWBAND = 'Microphone transcription cannot accommodate narrowband voice models, please select a broadband one.';
var chatToSend = '';

export class Demo extends Component {
  constructor(props) {
    super();
    this.testRef = React.createRef();
    this.state = {
      model: 'en-US_BroadbandModel',
      rawMessages: [],
      formattedMessages: [],
      audioSource: null,
      speakerLabels: true,
      sendMailButton: false,
      toggleModal: false,

      // transcript model and keywords are the state that they were when the button was clicked.
      // Changing them during a transcription would cause a mismatch between the setting sent to the
      // service and what is displayed on the demo, and could cause bugs.
      settingsAtStreamStart: {
        model: '',
      },
      error: null,
    };

    this.reset = this.reset.bind(this);
    this.captureSettings = this.captureSettings.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
    this.handleMicClick = this.handleMicClick.bind(this);
    this.handleStream = this.handleStream.bind(this);
    this.handleRawMessage = this.handleRawMessage.bind(this);
    this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
    this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleSpeakerLabelsChange = this.handleSpeakerLabelsChange.bind(this);
    this.getFinalResults = this.getFinalResults.bind(this);
    this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);
    this.getFinalAndLatestInterimResult = this.getFinalAndLatestInterimResult.bind(this);
    this.handleError = this.handleError.bind(this);
    this.sendTranscription = this.sendTranscription.bind(this);
  }

  reset() {
    if (this.state.audioSource) {
      this.stopTranscription();
    }
    this.setState({ rawMessages: [], formattedMessages: [], error: null });
  }

  /**
     * The behavior of several of the views depends on the settings when the
     * transcription was started. So, this stores those values in a settingsAtStreamStart object.
     */
  captureSettings() {
    const { model, speakerLabels } = this.state;
    this.setState({
      settingsAtStreamStart: {
        model,
      },
    });
  }

  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      // this.stream.removeAllListeners();
      // this.stream.recognizeStream.removeAllListeners();
    }
    this.setState({ audioSource: null });
  }

  getRecognizeOptions(extra) {

    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      access_token: this.state.accessToken,
      token: this.state.token,
      smart_formatting: true,
      format: true, // adds capitals, periods, and a few other things (client-side)
      model: this.state.model,
      objectMode: true,
      interim_results: true,
      timestamps: true, // set timestamps for each word - automatically turned on by speaker_labels
      // includes the speaker_labels in separate objects unless resultsBySpeaker is enabled
      speaker_labels: this.state.speakerLabels,
      // combines speaker_labels and results together into single objects,
      // making for easier transcript outputting
      resultsBySpeaker: this.state.speakerLabels,
      // allow interim results through before the speaker has been determined
      speakerlessInterim: this.state.speakerLabels,
      url: this.state.serviceUrl,
    }, extra);
  }

  handleMicClick() {
    if (this.state.audioSource === 'mic') {
      this.stopTranscription();
      this.setState({ sendMailButton: true})
      return;
    }
    this.reset();
    this.setState({ audioSource: 'mic' });

    // The recognizeMicrophone() method is a helper method provided by the watson-speech package
    // It sets up the microphone, converts and downsamples the audio, and then transcribes it
    // over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * outputs the text to a DOM element - not used in this demo because it doesn't play nice
    // with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream that
    // manages the actual WebSocket connection.
    this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
    
  }

  handleStream(stream) {
    console.log(stream);
    // cleanup old stream if appropriate
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
    this.stream = stream;
    this.captureSettings();

    // grab the formatted messages and also handle errors and such
    stream.on('data', this.handleFormattedMessage).on('end', this.handleTranscriptEnd).on('error', this.handleError);

    // when errors occur, the end event may not propagate through the helper streams.
    // However, the recognizeStream should always fire a end and close events
    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
        this.handleTranscriptEnd();
      }
    });

    // grab raw messages from the debugging events for display on the JSON tab
    stream.recognizeStream
      .on('message', (frame, json) => this.handleRawMessage({ sent: false, frame, json }))
      .on('send-json', json => this.handleRawMessage({ sent: true, json }))
      .once('send-data', () => this.handleRawMessage({
        sent: true, binary: true, data: true, // discard the binary data to avoid waisting memory
      }))
      .on('close', (code, message) => this.handleRawMessage({ close: true, code, message }));

    // ['open','close','finish','end','error', 'pipe'].forEach(e => {
    //     stream.recognizeStream.on(e, console.log.bind(console, 'rs event: ', e));
    //     stream.on(e, console.log.bind(console, 'stream event: ', e));
    // });
  }

  handleRawMessage(msg) {
    const { rawMessages } = this.state;
    this.setState({ rawMessages: rawMessages.concat(msg) });
  }

  handleFormattedMessage(msg) {
    const { formattedMessages } = this.state;
    this.setState({ formattedMessages: formattedMessages.concat(msg) });
  }

  handleTranscriptEnd() {
    // note: this function will be called twice on a clean end,
    // but may only be called once in the event of an error
    this.setState({ audioSource: null });
  }

  componentDidMount() {
    this.fetchToken();
    // tokens expire after 60 minutes, so automatcally fetch a new one ever 50 minutes
    // Not sure if this will work properly if a computer goes to sleep for > 50 minutes
    // and then wakes back up
    // react automatically binds the call to this
    // eslint-disable-next-line
    this.setState({ tokenInterval: setInterval(this.fetchToken, 50 * 60 * 1000) });
  }

  componentWillUnmount() {
    clearInterval(this.state.tokenInterval);
  }

  fetchToken() {
    return fetch('/api/v1/credentials').then((res) => {
      if (res.status !== 200) {
        throw new Error('Error retrieving auth token');
      }
      return res.json();
    }) // todo: throw here if non-200 status
      .then(creds => this.setState({ ...creds })).catch(this.handleError);
  }

  handleModelChange(model) {
    this.reset();
    this.setState({
      model,
      // keywords: this.getKeywords(model),
      speakerLabels: this.supportsSpeakerLabels(model),
    });

    // clear the microphone narrowband error if it's visible and a broadband model was just selected
    if (this.state.error === ERR_MIC_NARROWBAND && !this.isNarrowBand(model)) {
      this.setState({ error: null });
    }

    // clear the speaker_lables is not supported error - e.g.
    // speaker_labels is not a supported feature for model en-US_BroadbandModel
    if (this.state.error && this.state.error.indexOf('speaker_labels is not a supported feature for model') === 0) {
      this.setState({ error: null });
    }
  }

  supportsSpeakerLabels(model) {
    model = model || this.state.model;
    // todo: read the upd-to-date models list instead of the cached one
    return cachedModels.some(m => m.name === model && m.supported_features.speaker_labels);
  }

  handleSpeakerLabelsChange() {
    this.setState(prevState => ({ speakerLabels: !prevState.speakerLabels }));
  }

  handleKeywordsChange(e) {
    this.setState({ keywords: e.target.value });
  }

  // cleans up the keywords string into an array of individual, trimmed, non-empty keywords/phrases
  getKeywordsArr() {
    return this.state.keywords.split(',').map(k => k.trim()).filter(k => k);
  }

  // cleans up the keywords string and produces a unique list of keywords
  getKeywordsArrUnique() {
    return this.state.keywords
      .split(',')
      .map(k => k.trim())
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  getFinalResults() {
    return this.state.formattedMessages.filter(r => r.results
      && r.results.length && r.results[0].final);
  }

  getCurrentInterimResult() {
    const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];

    // When resultsBySpeaker is enabled, each msg.results array may contain multiple results.
    // However, all results in a given message will be either final or interim, so just checking
    // the first one still works here.
    if (!r || !r.results || !r.results.length || r.results[0].final) {
      return null;
    }
    return r;
  }

  getFinalAndLatestInterimResult() {
    const final = this.getFinalResults();
    const interim = this.getCurrentInterimResult();
    if (interim) {
      final.push(interim);
    }
    return final;
  }

  sendTranscription() {
    if (this.refs.transcriptedMessage.textContent != '') {
      chatToSend = this.refs.transcriptedMessage.textContent;
      this.setState({ toggleModal: true });
    }else {
      alert("<h1>There's no transcribed message</h1>");
    }
  }

  handleError(err, extra) {
    console.error(err, extra);
    if (err.name === 'UNRECOGNIZED_FORMAT') {
      err = 'Unable to determine content type from file name or header; mp3, wav, flac, ogg, opus, and webm are supported. Please choose a different file.';
    } else if (err.name === 'NotSupportedError' && this.state.audioSource === 'mic') {
      err = 'This browser does not support microphone input.';
    } else if (err.message === '(\'UpsamplingNotAllowed\', 8000, 16000)') {
      err = 'Please select a narrowband voice model to transcribe 8KHz audio files.';
    } else if (err.message === 'Invalid constraint') {
      // iPod Touch does this on iOS 11 - there is a microphone, but Safari claims there isn't
      err = 'Unable to access microphone';
    }
    this.setState({ error: err.message || err });
  }

  render() {
    const {
      token, accessToken, audioSource, error, model,
    } = this.state;

    const buttonsEnabled = !!token || !!accessToken;
    const buttonClass = buttonsEnabled
      ? 'base--button'
      : 'base--button base--button_black';

    let micIconFill = '#000000';
    let micButtonClass = buttonClass;
    if (audioSource === 'mic') {
      micButtonClass += ' mic-active';
      micIconFill = '#FFFFFF';
    } else if (!recognizeMicrophone.isSupported) {
      micButtonClass += ' base--button_black';
    }
    const onExit = () => {
      console.log('on exit');
      this.setState({
        toggleModal: false,
      });
    }

    const onEnter = () => {
      console.log('on enter');
    }

    const err = error
      ? (
        <Alert type="error" color="red">
          <p className="base--p">
            {error}
          </p>
        </Alert>
      )
      : null;

    const messages = this.getFinalAndLatestInterimResult();

    return (
      <Dropzone
        onDropAccepted={this.handleUserFile}
        onDropRejected={this.handleUserFileRejection}
        maxSize={200 * 1024 * 1024}
        accept="audio/wav, audio/mp3, audio/mpeg, audio/l16, audio/ogg, audio/flac, .mp3, .mpeg, .wav, .ogg, .opus, .flac" // eslint-disable-line
        disableClick
        className="dropzone _container _container_large"
        activeClassName="dropzone-active"
        rejectClassName="dropzone-reject"
        ref={(node) => {
          this.dropzone = node;
        }}
      >

        <div className="flex setup">
          <div className="column">

            <p>Select Your Language:
              <ModelDropdown
                model={model}
                token={token || accessToken}
                onChange={this.handleModelChange}
              />
            </p>

          </div>
        </div>

        {err}

        <Tabs selected={0}>
          <Pane label="Audio Transcription">
            <div ref="transcriptedMessage">
              <Transcript messages={messages} />
            </div>
          </Pane>
        </Tabs>


        <div className="flex buttons">

          <button type="button" className={micButtonClass} onClick={this.handleMicClick}>
            <Icon type={audioSource === 'mic' ? 'stop' : 'microphone'} fill={micIconFill} /> Record Audio
          </button>
          {this.state.sendMailButton && 
          <button type="button" className="base--button" onClick={this.sendTranscription}>
          <Icon type='upload' /> Send Transcription
          </button>}
          
        <Modal
          isOpen={this.state.toggleModal} // boolean
          onExit={onExit}
          onEnter={onEnter}
        >
          <h2 className="base--h2" style={{ textAlign: 'center' }}>Send Transcription</h2>
          <Alert type="info" color="blue">Please provide your contact information.</Alert>

          <Email />
          {/* <p className="base--p">
            {chatToSend}
          </p> */}
          </Modal>

        </div>
      </Dropzone>
    );
  }
};

export default Demo;
