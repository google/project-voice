# Project VOICE

Project VOICE is an experimental software developed as a communication support tool using generative AI for people who have difficulty in vocalizing and / or typing due to disabilities.

This software uses generative AI to predict possible words and sentences that might be implied by the user’s input. The user can select a suggested word or sentence using accessibility features such as eye tracking and / or switch access. We aim to enable users to input longer sentences in fewer steps than other input methods.

![Demo animation](/demo_hamburger.gif)

<!--- TODO: Add a link to the external promotion page. -->

## Before you begin

Project VOICE is a web application built on Gemini API, and it’s designed to be run on Google App Engine primarily. Please set up a Google Cloud project with these APIs enabled. You will also need to install Python and Node.js to build and run the application.

1. In the Google Cloud console, on the project selector page, select or create a Google Cloud project.\
    [Go to project selector](https://console.cloud.google.com/projectselector2/home/dashboard)
1. Make sure that billing is enabled for your Google Cloud project. See [this page](https://cloud.google.com/billing/docs/how-to/verify-billing-enabled#confirm_billing_is_enabled_on_a_project) for details.
1. Enable Gemini API.\
    [Gemini API](https://console.cloud.google.com/flows/enableapi?apiid=generativelanguage.googleapis.com)
1. [Install](https://cloud.google.com/sdk/docs/install) the Google Cloud CLI.
1. To initialize the gcloud CLI, run the following command:
    ```
    gcloud init
    ```
1. Run the following commands to configure the project and Application Default Credentials:
    ```
    gcloud auth login
    ```
    ```
    gcloud config set project <YOUR_PROJECT_ID>
    ```
1. If you wish to change the Google Cloud project for billing and quota, run:
    ```
    gcloud auth application-default set-quota-project <YOUR_PROJECT_ID>
    ```
1. Install Python 3.n if you haven’t.
1. Install [Node.js](https://nodejs.org/) if you haven’t.

## Development

1. Run `git clone <this repo>`.
1. Install libraries by running `npm i`.
1. Set the `API_KEY` environment variable for the Gemini API access.
    ```
    export API_KEY=YOUR_API_KEY
    ```
1. Run the local development server by running `npm run dev`. This will start a local demo at http://localhost:5000/.

## Deployment

This app is designed to be deployed to Google App Engine primarily.
Keep the following in mind when you deploy the app to your own Google Cloud project.

1. In your `app.yaml` file, set the following environment variables.
    - `API_KEY`: Your API key for the Gemini API.
    - `SECRET_KEY`: A unique, secret string used for CSRF validation.
    ```
    env_variables:
        API_KEY: "YOUR_API_KEY"
        SECRET_KEY: "YOUR_OWN_VALUE"
    ```
1. Run `npm run deploy`.

## Notice
Please avoid entering potentially sensitive or personally identifiable information (PII) into this application.

## Disclaimer

This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security).

This project is intended for demonstration purposes only. It is not intended for use in a production environment.

## Contributors

This project exists thanks to all the people who have contributed.

- Adriana Guevara Rukoz
- Atsuko Yamagami
- Atsushi Yamashita
- Kevin Chang
- Satoru Arao
- Shuhei Iitsuka
- Subhashini Venugopalan
- Tomoki Oinuma
- Yasuaki Takebe
- Yu-Sheng Li

<!--- TODO: Revisit this section. -->
