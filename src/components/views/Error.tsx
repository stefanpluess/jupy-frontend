import React from 'react';
import '../../styles/views/Error.scss';

interface ErrorPageProps {
  errorCode: number;
  errorMessage: string;
}

/**
 * Error page component that displays an error code and message.
 * Used in AppRouter and FileExplorer components
 */

const Error: React.FC<ErrorPageProps> = ({ errorCode, errorMessage }) => {
  return (
    <div className="error-page">
      <h1>Error {errorCode}</h1>
      <p>{errorMessage}</p>
    </div>
  );
};

export default Error;