# Contributing to Stream Deck Actions

First off, thank you for considering contributing to Stream Deck Actions! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include log output** from `daemon.log`
- **Include your environment**: OS, Python version, Stream Deck model

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any similar features** in other applications if applicable

### Contributing Example Scripts

One of the best ways to contribute! We love new example scripts:

1. Create your script in the `examples/` directory
2. Add a descriptive comment at the top explaining what it does
3. Test it thoroughly
4. Submit a PR with:
   - The script file
   - Update to `examples/README.txt` listing your script
   - Brief description of what it does

**Script Guidelines:**
- Must be executable (`chmod +x`)
- Must have a descriptive comment at the top
- Should use `xdotool` for keyboard actions when possible
- Keep dependencies minimal
- Test on a clean system if possible

### Contributing Code

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**Code Guidelines:**
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed
- Test your changes
- Keep commits focused and atomic

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or clarify confusing sections
- Add examples or tutorials
- Improve existing documentation
- Translate documentation (future)

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/streamdeck-actions.git
cd streamdeck-actions

# Install dependencies
pip3 install streamdeck

# Make scripts executable
chmod +x start configure create-action streamdeck-daemon.py

# Test the daemon
./start

# Test the UI
./configure
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update documentation files if you've changed functionality
3. The PR will be merged once you have the approval of a maintainer

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Questions?

Feel free to open an issue with the `question` label or start a discussion!

## Recognition

Contributors will be recognized in the project README. Thank you for making Stream Deck Actions better!
