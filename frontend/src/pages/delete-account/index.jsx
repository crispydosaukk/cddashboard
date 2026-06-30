import React from 'react';

const DeleteAccount = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delete Account</h1>
          <p className="text-gray-600">
            Submit a request to permanently delete your account and all associated data.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-sm font-medium text-red-800">Warning</h3>
            <p className="text-sm text-red-700 mt-1">
              Account deletion is permanent and cannot be undone. All your data, history, and preferences will be permanently removed from our servers.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-800 mb-2">How to Delete Your Account</h3>
            <p className="text-blue-700 mb-4">
              To request account deletion, please send an email to our support team.
            </p>
            <div className="bg-white rounded p-4 border border-blue-100">
              <p className="text-sm font-medium text-gray-700 mb-1">Email To:</p>
              <a href="mailto:app.crispydosa@gmail.com?subject=Account%20Deletion%20Request" className="text-blue-600 font-medium hover:underline block mb-3 break-all">
                app.crispydosa@gmail.com
              </a>
              
              <p className="text-sm font-medium text-gray-700 mb-1">Required Information:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Send from your registered email address</li>
                <li>State your reason for deleting the account</li>
              </ul>
            </div>
            <p className="text-sm text-blue-700 mt-4">
              Our support team will process your request and notify you once the deletion is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;
