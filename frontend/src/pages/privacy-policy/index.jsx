import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
            <p>
              Welcome to our Privacy Policy. This document explains how we collect, use,
              disclose, and safeguard your information when you visit our application.
              Please read this privacy policy carefully. If you do not agree with the
              terms of this privacy policy, please do not access the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
            <p>
              We may collect information about you in a variety of ways. The information we may collect
              via the Application depends on the content and materials you use, and includes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Personal Data: Name, email address, phone number, etc.</li>
              <li>Derivative Data: Information our servers automatically collect when you access the Application.</li>
              <li>Financial Data: Data related to your payment method (e.g. valid credit card number, card brand, expiration date).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Use of Your Information</h2>
            <p>
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience.
              Specifically, we may use information collected about you via the Application to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Create and manage your account.</li>
              <li>Process your transactions and send you related information.</li>
              <li>Email you regarding your account or order.</li>
              <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Application.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Security of Your Information</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information.
              While we have taken reasonable steps to secure the personal information you provide to us, please be aware
              that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission
              can be guaranteed against any interception or other type of misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us.
            </p>
          </section>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
