import React from 'react';
import PropTypes from 'prop-types';

export default function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>
          Hearing Aid Support Service
        </title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/favicon.ico" type="image/x-icon" />
        <link rel="stylesheet" href="/css/watson-react-components.min.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/bootstrap.min.css" />
      </head>
      <body>
        <div className="container">
          <h2 className="base--h2">Hearing Aid Support Service</h2>
        </div>
        <div id="root">
          {children}
        </div>
        <script type="text/javascript" src="scripts/bundle.js" />
        <script type="text/javascript" src="https://cdn.rawgit.com/watson-developer-cloud/watson-developer-cloud.github.io/master/analytics.js" />
      </body>
    </html>
  );
}

Layout.propTypes = {
  children: PropTypes.object.isRequired, // eslint-disable-line
};
