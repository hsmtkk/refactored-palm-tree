FROM python:3.11
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt
COPY chat.py /app/chat.py
CMD chainlit run chat.py --host 0.0.0.0 --port 8000
