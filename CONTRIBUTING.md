# Contributing to xeokit SDK

First off, thank you for considering contributing to xeokit SDK! We welcome contributions from everyone and appreciate your efforts to help improve the project.

## Code of Conduct

Please note that this project is governed by a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. You can contact us via [contact Creoox](https://creoox.com/en/contact/).

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/xeokit/xeokit-sdk/issues) on GitHub. Provide as much detail as possible to help us understand and reproduce the issue, including:
- A clear and descriptive title.
- Steps to reproduce the issue.
- Any relevant code snippets or error messages.
- Your environment (operating system, browser, version of xeokit SDK, etc.).

### Suggesting Enhancements

We welcome suggestions for new features or improvements. To suggest an enhancement:
- [Open an issue](https://github.com/xeokit/xeokit-sdk/issues) on GitHub with a clear and descriptive title.
- Explain why the enhancement would be useful.
- Provide any relevant code snippets or examples.

### Check the Checklist

1. Create/modify the code
2. If applicable, ensure that the API documentation is up-to-date with your changes;
   - Edit the ESDoc comments, if neccessary
   - Run `npm run docs` to regenerate the API documentation
   - Run `http-server` (or equivalent) and check `./docs` in your browser - see if your documentation updates look OK 
3. If applicable, ensure that the TypeScript types are up-to-date with your changes
4. If you added a new feature, create an example in `/examples` to demonstrate it;
   - Derive your example by copying a similar existing example 
   - Run `http-server` (or equivalent) and check `./examples` in your browser - see if your example look OK
5. Write a comprehensive description of your contribution in a PR request, with links to example/docs if relevant

### Pull Requests

Before starting work on a new feature or bug fix, please check open issues and existing pull requests to avoid duplication. If you plan to work on something substantial, it's a good idea to open an issue first to discuss your ideas.

To submit a pull request:
1. Fork the repository and create your branch from `master`.
2. Make sure your code lints.
3. Commit your changes and push to your fork.
4. Open a pull request with a clear title and description of your changes.

### Sign the Contributor License Agreement

Please make sure you have signed our [Contributor License Agreement](CLA-Creoox.pdf) and sent it to [contact@creoox.com](mailto:contact@creoox.com). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once. And if you represent a company, then please [contact us](https://creoox.com/en/contact/).

## Development Environment

### Setting Up

1. Fork the repository and clone your fork:
   ```sh
   git clone https://github.com/your-username/xeokit-sdk.git
   cd xeokit-sdk
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Coding Standards

Please adhere to the following coding standards:
- Use [ESLint](https://eslint.org/) to check for code quality.
- Follow the code style defined in the project's `.eslintrc` file.
- Write clear, concise commit messages.

### Documentation

We appreciate help with improving our documentation. If you make changes to the code, please update the relevant documentation in the `docs` directory. See also ressources below.

## Community

We strive to create an inclusive and welcoming community. Here are some ways to stay involved:
- Join discussions in issues and pull requests.
- Help review and test contributions from others.
- Share your projects and experiences using Xeokit SDK.

## Resources

- [User Tutorials](https://xeokit.notion.site/xeokit-Documentation-4598591fcedb4889bf8896750651f74e)
- [API Documentation](https://xeokit.github.io/xeokit-sdk/docs/)
- [SDK Examples](https://xeokit.github.io/xeokit-sdk/examples/index.html)
- [Issue Tracker](https://github.com/xeokit/xeokit-sdk/issues)
- [Discussion Forum](https://github.com/xeokit/xeokit-sdk/discussions)- 
- [Enterprise Service Desk](https://creoox.atlassian.net/servicedesk/customer/portal/1)
- [Contact Us](https://creoox.com/en/contact/)
- [LinkedIn Page](https://www.linkedin.com/showcase/xeokit/)

If you have any questions or need assistance, feel free to reach out via issues or our discussion forum.

Thank you for contributing to Xeokit SDK!
