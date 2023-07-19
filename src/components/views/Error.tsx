import React from 'react';
import '../../styles/views/Error.css';

interface ErrorPageProps {
  errorCode: number;
  errorMessage: string;
}

const Error: React.FC<ErrorPageProps> = ({ errorCode, errorMessage }) => {
  return (
    <div className="error-page">
      <h1>Error {errorCode}</h1>
      <p>{errorMessage}</p>
    </div>
  );
};

export default Error;