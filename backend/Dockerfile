# Use the official Python image
FROM python:3.11-slim

# Set working directory to the app user's home
WORKDIR /code

# Install system dependencies (libgomp1 is required by LightGBM)
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Create a non-root user (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    MODEL_PATH=/home/user/app/flood_risk_model.pkl

# Change the working directory
WORKDIR $HOME/app

# Copy the application code into the container with correct permissions
COPY --chown=user . $HOME/app

# Hugging Face Spaces uses port 7860 by default
EXPOSE 7860

# Command to run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
