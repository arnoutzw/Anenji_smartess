"""
Setup configuration for shinemonitor-python package.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="shinemonitor-python",
    version="1.0.0",
    author="ShinEmonitor Python Library Contributors",
    author_email="support@shinemonitor.com",
    description="Complete Python library for ShinEmonitor/Eybond solar inverter monitoring API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/shinemonitor-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Home Automation",
        "Topic :: System :: Monitoring",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
        "Typing :: Typed",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-asyncio>=0.20.0",
            "pytest-cov>=4.0",
            "black>=22.0",
            "flake8>=4.0",
            "mypy>=0.990",
            "isort>=5.11",
        ],
    },
    keywords="shinemonitor eybond solar inverter monitoring api",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/shinemonitor-python/issues",
        "Source": "https://github.com/yourusername/shinemonitor-python",
    },
)
