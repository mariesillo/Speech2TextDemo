import React from 'react';
import PropTypes from 'prop-types';

export default function Transcript(props) {
  try {
    const results = props.messages.map(msg => msg.results.map((result, i) => (
      <span key={`result-${msg.result_index + i}`}>{result.alternatives[0].transcript}</span>
    ))).reduce((a, b) => a.concat(b), []); // the reduce() call flattens the array
    return (
      <p className="base--p">
        {results}
      </p>
    );
  } catch (ex) {
    console.log(ex);
    return <div>{ex.message}</div>;
  }
}

Transcript.propTypes = {
  messages: PropTypes.array.isRequired, // eslint-disable-line
};
