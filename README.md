# 실행가이드

## 1. 압출 풀기

## 2. cmd 열기

## 3. selenium-crawling-win.exe 파일을 드래그해서 cmd 위에 놓기 ( 해당 파일 경로가 적히게 됨 )

## 4. 필수 옵션 설정 ( 크롬 드라이버 설정, resource 설정 )

- chromeDriver 다운받기 (https://chromedriver.chromium.org/downloads 에서 현재 크롬버전에 맞는것 - xx.xx.xx 의 버저닝 에서 앞 xx에 해당하는 숫자만 맞으면됨 )

- cmd 창에 3번의 경로가 적힌 뒤에다가 한칸 띄고( 모든 옵션간 구분은 띄워쓰기 ) driverPath= 입력후 다운받았던 드라이버 드래그해서 cmd 위에 놓기

- 다시 한칸띄고(옵션구분) resourcePath= 입력후에 압축 풀었던 폴더에 resources폴더 안에있는 sample.xlsx 파일을 드래그해서 cmd 위에 놓기

## 5. 지금까지 잘 햇으면 아래와 유사한 형태의 경로가 되어야함

- C:\Users\pyeong.oh\Downloads\빌드파일\selenium-crawling-win.exe driverPath=C:\Users\pyeong.oh\Downloads\빌드파일\chromedriver.exe resourcePath=C:\Users\pyeong.oh\Downloads\빌드파일\resources\sample.xlsx

- 포맷으로 본다면 {프로그램경로} driverPath={driver 경로} resourcePath={resoure 경로} 가 되어야함
  여기 까지 했으면 필수적으로 적어야할건 다 적었음 ( 바로 실행가능 )

- 이후 area, row 설정을 해주어야 하는데 이 값들은 모두 resources/sample.xlsx 의 행단위 번호가 기준이됨
  ( 이 말이 뭐냐면, area를 area=2 와 같이 입력하면, 2번째 행을 의미하는데, 엑셀시트의 첫번째 행은 제목이고, 두번째 행부터 area에 대한 코드가 적혀잇으므로 01번 지역이 실행됨, row도 마찬가지 )
  row는 장르, 서브 장르 상관없이(왜냐면 모든경우에 수가 행으로 펼쳐져있기 때문) 행을 적는다

## 6. area 와 row 적는법

area와 row는 모두 하나의 대상으로만, 그리고 범위로 지정할 수 있다
즉, n번째 행을 실행하고 싶은경우 area=n
n번 이상의 행을 실행하고 싶은 경우 area=n~ (이 경우 area는 n부터 마지막 areaCode 인 47까지 수행) (row로 적엇을 경우 420까지)
n번 이하의 행을 실행하고 싶은 경우 area=~n (이 경우는 n 부터 처음인 1까지 수행)
delay=
