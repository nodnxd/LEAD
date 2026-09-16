-- 2026-09-16 노션 "진행중인 리드" 동기화
-- 노션 30행 대조: 신규 1건(STUN-X), 동일 25건, 내용 변경 4건(마감 지난 8월 건 — 제외).
-- memo 마커 + 내용 해시로 중복 방지 → 여러 번 실행해도 안전.
with n(content) as (values ('STUN-X Digital Single

STUN-X(스턴엑스)는 웹소설『우주 기강 잡으러 데뷔합니다 : STUN-X』를 기반으로 탄생한 혼성 버추얼 그룹입니다. 작품은 152개의 서로 다른 행성에 각자의 문화와 개성을 가진 존재들이 살아가는 우주를 배경으로 합니다. 각 행성을 대표하는 참가자들은 ‘우주 아이돌 리그’라는 아이돌 오디션을 통해 우주에 모여,서로 다른 행성과 배경을 가진 이들과 함께 아이돌로서 새로운 이야기를 만들어갑니다.
STUN-X는 이러한 우주 아이돌 리그를 통해 만난 멤버들이 하나의 팀을 이루어 활동하는 과정을 음악과 퍼포먼스로 확장해 보여주는 그룹입니다. 서로 다른 행성에서 온 만큼 멤버마다 고유한 배경과 캐릭터,보컬 컬러를 가지고 있으며,각자의 개성이 모여 STUN-X만의 팀 컬러를 만들어갑니다.
4명의 멤버로 첫 시작을 알리며,이후 새로운 행성에서 온 멤버가 한 명씩 합류하며 팀의 구성과 음악적 
스펙트럼을 지속적으로 확장해 나갈 예정입니다.
필수 확인 자료 : www.instagram.com/stun.x.officiaL 

MEMBER CHARACTER
• 아칸: 두껍고 낮은 톤 / 서브보컬 / 팀의 저음과 무게감 담당
• 탐이나 (여성 멤버): 미성 / 메인보컬 / 밝고 청량한 분위기 담당남장
    ◦ 여자 캐릭터로 높은 여성 음역대 X (하이노트 최대 3C)
• 레제프: 중저음 / 리드보컬 / 감미롭고 부드러운 음색
• 타이탄: 퍼포먼스 디렉터 / 서브래퍼 / 리듬감과 퍼포먼스 중심의 파트
MAIN CONCEPT
풋풋하면서도 호감형인 소년

MUSIC DIRECTION
• 2-3세대 K-Pop 감성의 밝은 Dance Pop
• 경쾌하고 산뜻한 Dance Pop을 기반으로,과하게 트렌디하거나 세련된 사운드보다는 2-3세대 특유의 친숙한 멜로디와 캐치한 훅,따라 부르기 쉬운 대중성을 강조.
KEYWORDS
밝음 / 청량함 / 풋풋함 / 소년미 / 호감형 / 에너지 / 친숙함 / 대중성 / 캐치한 훅

REFERENCE
SEVENTEEN – 예쁘다
[M/V] SEVENTEEN(세븐틴) - 예쁘다 (Pretty U)
• 경쾌하고 산뜻한 Dance Pop / 밝고 풋풋한 소년미 / 에너지감
HIGHBOYZ – 그날이 오면
하이보이즈 (HI-BOYZ) - 그날이 오면 (When the Day Comes) PERFORMANCE VIDEO
• 대중적인 멜로디 / 친숙한 K-Pop 감성 / 따라 부르기 쉬운 훅

희망하는 요소
• 친숙하고 따라 부르기 쉬운 대중적인 멜로디
• 한 번 들으면 기억되는 명확한 후렴 훅
• 2~3세대 K-Pop 특유의 한국적인 멜로디 감성
• 멤버별 음색 차이가 자연스럽게 드러날 수 있는 멜로디 및 보컬 구성
• 너무 세련되거나 실험적인 사운드보다는 직관적이고 듣기 편한 음악
피하고 싶은 방향
× 지나치게 트렌디한 사운드
× 너무 어둡거나 무거운 분위기
× 난해하거나 실험적인 구조
× 훅이 약하고 멜로디가 복잡한 곡
× 지나치게 유아틱하거나 귀여운 방향'))
insert into leads (host_id, artist, content, deadline, kind, status, memo)
select 'def69b95-3bd7-4059-8489-b8a1951a1441', 'STUN-X / 3Y CORP', n.content,
       '2026-10-11', 'lead', 'pending', 'notion:3dcf3a3b-3414-8027-baab-f1b78c5ddb95'
from n
where not exists (
  select 1 from leads l
  where l.host_id = 'def69b95-3bd7-4059-8489-b8a1951a1441'
    and l.memo like 'notion:3dcf3a3b-3414-8027-baab-f1b78c5ddb95%'
    and md5(coalesce(l.content, '')) = md5(n.content)
);
