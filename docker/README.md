#### Build a docker image

```
# in project root directory
docker build -f docker/Dockerfile -t project-voice .
```

#### Run the docker image

you can run in either interaction mode or detached mode

##### interaction mode
```
docker run -i -t --rm -p 5000:5000 --name voice project-voice
```
- use Ctrl + C to exit


##### detached mode:
```
docker run -d --rm -p 5000:5000 --name voice project-voice
```

- use `docker stop voice` to exit
- use `docker logs -f voice` to check logs