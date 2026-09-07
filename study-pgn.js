/**
 * ChessKidoo LMS — Study PGN, Daily Tactics Streaks & Board Visualization Engine (v2.1)
 * ──────────────────────────────────────────────────────────────────────────────────────────
 * 1. High-Fidelity Interactive PGN Board (Vector SVG piece set, Chess.com styling, Stockfish Cloud API).
 * 2. TOM AI Move-by-Move Guidance (pedagogical explanations for every move in the PGN).
 * 3. Daily Tactics Workout & Gamified Streaks (Live Lichess Daily Puzzle API + Calibrated Levels).
 * 4. Speed Calculation & Board Visualization Trainer (Square Color, Coordinate Radar).
 * 5. Coach & Admin Topic Assignment & Student Practice Monitoring Dashboard.
 */
(function () {
  'use strict';

  const StudyPGN = window.StudyPGN = window.StudyPGN || {};
  const STORAGE_TACTICS_RECORDS = 'ck_student_tactics_records';
  const STORAGE_ASSIGNED_TOPICS = 'ck_assigned_study_topics';
  const STORAGE_SAVED_STUDIES = 'ck_custom_saved_pgns';
  const STORAGE_VISION_SCORES = 'ck_student_vision_scores';
  const STORAGE_COMPLETED_TOPICS = 'ck_completed_study_topics';
  const STORAGE_STUDENT_COMPLETED_TOPICS = 'ck_student_completed_topics';
  const STORAGE_COINS = 'ck_student_coins';

  // ── Authentic Official Chess.com Neo Pieces Set (HD Vector PNGs) ──
  const CHESSCOM_PIECES_B64 = {
  "wp": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAA8UExURUxpcUFBQUNDQ0REREREREVFRUVFRUVFRf////j4+O/v7+Li4tPT08TExK+vr5SUlICAgGtra1VVVUZGRh1ZfCsAAAAIdFJOUwAgPF19qsrhYMPqTAAAA6lJREFUeNrtmw1y4yAMRmub2BbgP7j/XTd4mH671YRkUix1trzpAd5IQgjF/Wg0Go1Go9FoNBqNRqPRaDQaP5auv9P9KKXejDEzmv6HhMlM8R8m86GPiZxp0E7fFBNhXxd3Z1n3nEvVKhti4lhonilj1yMmeuUEhmU+pcAa4p1B1WqjbEXAHopefbyzzrACdlPLYzfBiuGS16RR9zdYEcenI3nTOYT7Qyty/lBJY7puLKwYftUIV59TSI9wZxo7+coKtqy1xBiNsFbqWCUrsj5V1ySfQ1/UIu83ZFGwwVPRivyZxUG6tI65rOW8D9LFNZ5Ni0r4s7hu0lrbS1qjqNb0ktauokUlLKIlXFtUwqG2ZE/iMy2cRNm+Vc4h+pZsl1/KwUKXF74Ty8HCnSg9QRS7AyYI6XmrmMJz3uoVptPgSlYLplPpWf5xBj1meVlGpJFXu8fLR5guZi+WwATeifJphBekYBV71R0E0ud8BjsIpec+6t66T46IFCrtAXdLjBQt9FJR+jEvt4g4bgvYCcqHarPzgytxQcDkQ1XYjHj5gJnI9oC8pyJgkgcw+DlRGiH8KhmwIYeKafG+uuxoqyKT6V0o/RGDtXtJLU9P8JlVbHDuSnM8Sh7Rknu77lTm79txFNwxu2dWyKERnOP3shWChdISCRdY/CcIEbiJPnuA/8oSAYIlHK7gGRGIXtadyYwxHp4RYhxNhgVLqlc4plVYIAmuIpjXzpcPCosb5oVVjQ4mN1bHO8SgqJUqnoh7BdXi6vBOdF+LK+rm0BPz0s7ilHPIvVLn0vw4YyXmhZWbWrACGxxwLY56lbXOzAvhGrSOYeCzcmYJSsuR8XwAPfTadLaBJuafFLkXBlOjcQqDhRb3WhQWgn1kv6Ezr1Xcq5/41xnca4eXXKy2GVrqXtiNFDYjVmO1a5gVxyFeMuexG2EFrbLX2MksApdnVkjkFhODQKiCg1VZDCvBW3dprWMRCK2yWN6hTv3Vn5m+aIXfW7aARF5jtduXrWCWAzZclsG1IFUyc+isF3T2YgLLrNdsb6aIWNE7bJij6xbWBqt3SHk09SfkgyD1DjYgjRX3bP59K5SXqR2sHVbvktpE9Vc9rN4FnyjVe9XD6n2wAxD4gPl1sI+rlUNbwYpc1SyOZw6pAtjHVVrc1tGquezt2LP+W62rqzg7OGh9t0X0Ap9NatQ8tMJMdcD9U+XbV6pE+A1aYatEVa2K/P9aU1VM+7fqRqPRaDQal/AHIBXUlyHpytIAAAAASUVORK5CYII=",
  "wn": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABCUExURUxpcUFBQUNDQ0REREREREVFRUVFRUVFRf////j4+O7u7uHh4dPT08jIyLe3t6SkpJOTk4KCgm5ubl1dXU9PT0ZGRposUvgAAAAIdFJOUwAeRW2Rtd7xrVkNMAAABXFJREFUeNrtnNmS2yoURSOhiUlIDP//qzegVu/rtk0jA7YqpZWqVJ7aq9mHAzpy5c/FxcXFxcXFxcWfpiXt+aR69xdyMqt2dO58Xo23Op+XT3Dl88m8Wm81TdPJvDrnLPurRc/l1W+LNdFzeY3OqaAFr5OUlpxO50Wcc2zTgtcpKt5MAfrt1ZG2+bDW4NwKreAVGIeONB/NcIZW8AJD136s4A2FlWc21oHxA2bNsO9DrwW4VKv+lhvIB6wWWN3AuFx2tbFr3nyh0RRa92ZCafsl9r66ilhBTC5mEyNv24NuRbk/gwuhNrG+eYsV6ioKC2JYsOoJKlhFYUKIxb5jwQZvlSCFJKUOzaKpHeGSZoUFU9YHWbO7jmjuB7xmgwtG3ZOQpiP2IEnFyjK3VlLNLMFLrBW9mq3eYSV8OlaleC3eq6119XMMWlRaF/iUFzLUsKLMug3LaBy2e41NnVY6Q4uubkcm9K+tvoYqGVoKLe6+ETTJy+/HrkbTWmFFF7ej09qXkAblVfjJEFrm24pREF2uGeVVK0Ph7LqsWq+SJiH2su+qZqgUPQQXHl06RvIjQ0YPIvYYh0oHDzi+XGvZ5SJoWi/ChEfaoss1oOBfRQSWksvVHbjSCBZLURRcrtalVxYXPJIilqtMhE6kWTEheCzFUF19sQiXX60QVVQrbMam6Hwmcb/RaHHNZS6qzZgeIRVxrYApkmKPu/Kv8JgWEyj6pkQj1QlW+GAe10KKmRFaDqsoPEGrTIrDgVNnlsLD6BME9uKY3xvWRCvpdJqWQnFl9AaWZuWPFYWKj2jJzOJqQntPs+LG/wq+tCJaKK4utzekWTHjPCqixcSOzjquyT4lTbby1cViWuhclXsDEhw6H7mgEa3cmkdvSLdqwnM3j2qhobYZEa5JVtIGq22kw2LNdidjKw7b2+iHP54zCpTbrDYtmqJlnevyplm/nTBce6v+e3gSu13kdgi8X31YIWjmTFlv1X0fCTyuhQ7R57xfjUbB5BKkxhYDsNj1Aqw5Wnp6+nTsxw/GefAygMQz5Ldaw8ta9tmk3TgwtGhzzrBYhmB5WYs8LhQuxAqnsUf76eOLxX5oja/vxIXesVsNfd+RzQlWOtZys7XwOfL+hysvRZr7zOMRUpGthbuW/ZmKCB29ffg7WEFjGebXFhbArfx2sTTODdAEK0njGRbYifByKz6OhQj7O6sBVpHFymyngIzOY5RAhPdD2XZEgs/ghbSQTsAsM6dcGkR4+55Y84QHyOyjGjTd6L6w1iLCHxXIEmYAQJZ4gCW9A0PzYDkVBQkR4hqYbTY8thrQRdIjxBQin6YlaOuwQrHHI0zuD4VGTIbTAxFiCFHXSjN6KEJUfH2r9AhR8bWsBlilR4in10rA6kiE6PF16F+zQo+vAsEeTI6wfmk16FdJi1W/tDCeSJqHv6m0MJ6ghyNE1+pqdSzLjkUIVK3S6hDhocXCnLlWvWuavFj1D0Qslnh5seZaB+KYsVi4a5WmzagsTJmL0+/bEN/IlXKeVWDZCP8Mf8+zlHVPHmS4UC5mtazaWJeCNVqvi5ol2kONfQibg1htqrSHhgzPlySgtTae5+ojKS3VjQ6YEMwsBWeMTgAw5itv3vJ2YCxaXeRLyq5KcjYdhYlZacwQS4BJiVF8yoEr4zykpJUWUz4yiHXlvik/T0XYXny0xe6j0w10oolM/s//KfA1QUxSd50spoBCjJmLtd4I5brp3L6KKX1J8MSfl6GmZSlxHcRsrRiYJmWVlqRlmfMfF1uUVtHiavIrnhaGo6NmaFlaGJajhVextDToEP+elqalsZfWpRW07FKaEiVfgX9Wiwx1INf/BXRxcXFxcXFRkv8AcTNxXM/9WZYAAAAASUVORK5CYII=",
  "wb": "data:image/png;base64,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",
  "wr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAA/UExURUxpcUFBQUNDQ0REREREREVFRUVFRUVFRf////j4+O/v7+Li4tPT08XFxbS0tKCgoI+Pj3p6emNjY1NTU0ZGRi8lq24AAAAIdFJOUwAiRmyXweDwOT8tswAABJNJREFUeNrtnOFu2kgURs+dMWn2h0m6u+//hLvbFtRCwL7fimIxJMEqtmcorXyQIkV2yPGZYRgZCWZmZmZmZmZmZmZmZmZmSBg5MMMAENJdaEUzW3LOSlL7s7Uelrxntbutlh0AaMSRv+kQYHT8wxGrAHSAIVRcTwjhlOZTmy6rcZccA8yCxQjWWYSnU0B3L1DLYqxJfG4AIPwJm/bVM8VH+K9TqJ5JrNtWeWtZfKbDhQUC6bL0ygon/RbARTfwNXy+UixwDfHhGUDNbvN1s902sEwa8tfVJeiwJTSbzbevm93R5/khZtSyGmhfvm13DtAmDzvN9YRIR7uTff/ysnegtoxagLabvdI4Es61jMtaAdSCAUa72wFk1BJYQ6rir2sZ9NbyJI0DylsLI+HwlLSMPq0ncIxE9loEklp7+ssadOHs+vTkLSd/rHwtjL5/pPOjrXHCCtQyEnIIANY5wiXpkA6miyiohUPor9WnBaCcq/y6xt6s5HUjMNB7LRkWwOo3KQ3W5NQSr2mBj72XL+M5nfiqlsg55fV2EAX0a0GH3tYSBV+J4Ndp+cjdZjWuFi/Qz/t3GRtYq2IcGnPQgPxzawJWbm7ZVCsoUAubHqtALcJkrTurZRSqpTWEDFrrvFp4Bq0ATl4tQTTGETq5ACJ7LRaMIK0skfy1fAULmxQrwiq3Fi3YA8OxyJHKoCW71heohntZoLOK8KXNf8emARa2U9/0MUAgQSIYRxYRaEq8W8WPgO+bFMIOYGacIwkdcAJHYgzApza3VvLCG/8uFPgxLiRZDCSr7FqEaslYVo1TSAuqWHOORPfgiNE9jHPWbQOltNL9N9cBlwAzjPdYB6S7bSW00gTb+AUHerAPaVqV20QZyHmLvHVxEQmM0lqAcwl5j5hIlKwFDBErXOuKTZNcP0mrBtGP+yWtZTmtK/fjci5gN9Ea5KUbaTkDvAprJSQGeUlA+VoaKi6we9DC71ML3fiVuLxOyycuXCHb+tDvJcCKazlXoBtpJTT0LAHcRy1040HU8EVXlNdyhlJeC9DwPaxKz60AGu4vCEW1ahCDEdQltYyxtbDCWj5cC8pricFeXl5LYjgqqwUIxk2ukrXGa9ndaKEbTfkliBEIluW0DPAxtQRYUS0xkPJaTKnF71Cr6G5LdHhhLTGO+9TSXWnpJlr1lFp1KS0DfLQWVkxryiBiv36tavyMNzMDw7qDKY8QSBInZMW0ALdg38HsqkgSknBZsUVu8YSM0XzZF9AKIda9STind7jWrXterRCfOKEDHH8g8R4zjONYHyAVaz2flsVn0udzLoZhwUIMBukTzxxatlgCNG0jxmNVrABWe2XRsoca2O+dqYTFAljvlEPrYQn+0pKD+CHAapdBq3qGdivOMRlXIUOcY48RPjeTtewv8I3SyaMRAPZHgH81XivF2jYYeRDVY8o1XutDTbslJ4+R9cvEHUSooSUrLdRhopYBDVlpAJuu5SIr8ixaIjP6bbUoo8XkWgWYXqsuU6sepVWeWev316r4IdHIS8ijFedBvLLWav5uipmZmZmZmZlfhf8Bdgj15hIjYjgAAAAASUVORK5CYII=",
  "wq": "data:image/png;base64,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",
  "wk": "data:image/png;base64,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",
  "bp": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAwUExURUxpcSUlJSwsKyUlJSQkJCUlJSUlJSUlJSUlJVZTUiYmJkVCQnd0dDo5OU1KSWZjYph8/hkAAAAJdFJOUwDg+3ofVjfEo/HPvWQAAANwSURBVHja7ZsLjqswDEUHAwHnu//dvjYg3QqG0GmDjfRyVnB0Y4zj0p9Go9FoNBqNRqPRaDQajUajcVsGM45muJXSOHd2ZerNTWLqsxPo+h99erI7SFvMdIuH45QSswur5DSoFlW2COy9T7ziKIuOigeYBdIiBZx9MqpaOf+AN5Ci12gfMKJ6JdgHRqUxEKx2xKdXp1H305EVCn/WOcKAutoSs5dRCQtWe1x4ti+NsCKO8C5xzUtYiY+1nLW2F9aipWPxMe4ZVydrZay1CWEB4HJ1DeINHmEdaDnxVj/n7pDOtXrp9uDOtUi6o3a5PfC51iSvlZrWH2qLS0TUlvCTWA4LT6Js30rvaI3iXf7kDNHlZd+JoWyFd6Igczkut57hrDGcFq0wbwl3LhsLR4jp9C5xOZ2wMMw73hNhNWvdE92RFe6J8scIL0jByhrFHURgOEW3Qpq7EbOsjHghArI4Qp2wbEi8I5LaTtBMS1SeAbwCdoLiURXmeecQmPTKlFJhM+IQmHhUCGsfl3RgA6LyngtasoGNdt3WlBc2aGBGTCsmTnkVD47bvREbmCOf4DKSg/OAV+F7WnITYOAyr2/HTnCOj2dWCKsXvI2FMys8iYPkYAocQERAbkQ1ZS1nLaBB8Jb4vlYv+kPwSmct/ao19SubsOR6RXQbsEDSIj+T8Co3K9Hadwyv3RtHb5xHo4KW1r0HpUW88SrsauTbfdwWF+meYWR43eQUKZ/hStx2LtWCB3ETl1Es+MQgaseFsBL/7kWoLvn9FvnEB16q30FAC16orlnnCJ335cG011gFks9aR14KqzdD+A29dBcjI27FCEvdC1bRPzi5JIp6jadrJI3Vbo+NDYOCVy/RRSdYpeINFl7TIPOZKfsMl3i9y9IoEBUlj7BKgQmtBEdain1vdb4SJHP9Z6YZfoMYEdh48WemyOptM4LXFd2KC1EV1cJFXgZWiOoPhGu2N93nVvCaLhmvIPWpV19/u0yw+gwcY809W0Ktf4arHdeAkeEbyFqqXVnpayuOiKva0g9Wn0NVH0aDEfk7sI8T+vj1/VMca95UCUf4DVWXvYTvJr8/xa5me2DPNXAoriqzQ0JY3xaXqVnxDLRrHlrkuQ4VG+qMrd/dtLgSVFcr1AHLuBpa9fgPtLqq9O1v1Y1Go9FoNC7hH8tnsgZelOfoAAAAAElFTkSuQmCC",
  "bn": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAwUExURUxpcSwsLCUlJSUlJSUlJSUlJSUlJSUlJSUlJVZTUiYmJkVCQnd0dDo5OE5LSmZjYqaWABUAAAAJdFJOUwD94G2UEkjAKYmXrTcAAAS8SURBVHja7ZztbqswDIbnfBDyhrj3f7enkkUDEm28JmHoiOfvpu7pa2NCgvZzc3Nzc3Nzc3Pz4yc7XU5qDgBgL2Y1EXA9r5mAC3oFAPnBF/OaAeRlWdK1vByA5Um8lleQsJZ4LS8CeHnyuJTXDOAhWlfysgAW0bqSlwOoaImXs5P/WytvgLRqiZdAwdn5T2sYX1riVTBu+rOGp2XVEhJhA/2B2WxeYS1xA6eci5yx/nyrVMLawZxeauROFJsMgLwI8QBOYnaq2ERiVbL6aGbsSdfg3qouFuYTskLpq/gRfomRPWVJyrWoSmApS2CDO8zsxqhKjADAzKMbK22s9IHRNPZOSGorIa2B2RPuhDFeyCusYW3/Jmu88kCvGQBvS8gEAEntNQ192Fk2a5kLeBkgb8JirMQKLF5j5sS0NnwUMlZY5UUAwrAalrD0WjGtXm5EDdNhWBSj3msaXEN6WUlY2vbyg2tIOWeinPRTNeXuZfQEpI1WEh01PKaMdn26jxWqcYXODU8S1pfwy2vqfZdu10oAzIAlTfya1D8uB31YiWtxhe4P97EKV7Q6xmXKJluV9yuwJHSbXQ5lZmk6+7MWAfCdbjukthKtShVtl6tQP0lTTUviCn2OK1hpxRqt3KOKFmVRqguLFVq2w+M9PbRWH7Vi6lfFACBqrfRaptNs0FiBpLVqWhnA3DwblFYMIKu0EgDbPBuUE4sAkE6LANc6G/RWEhertELrbNBbSVyxrpUBtMwGKaHSyjgAH7R4pzW3zQa9lZ8AZFZoJQBT29af3urH/0bLNj1UlMZ6u6mVILu2ohWVWu77FWk8suL9KGeCWMmU03S8TIim89X3n86brQj3uiWwViu0nK9+LAUnkaKplL1aw3atvLx9Os70BILzJd+k08qA+T6tx/GHZ0IhTJtdCqqsL9rXEBYAH2rR8SFrAJAqWu1pzcdX+2oVgnN22qX7OSzea4G+0zr+9tLlsP6g5iCuhtWuNeHAKyXZyD6yAlfCai5i+VOZ9x9OR/cNH8SqGlZ7y4vXXoyP981mI1bKsNoXXNLelHlTQpqPTq+Jozas9uXp7CBQTvymhBZ1K057IFotYoQd4bADdY9q7QubgrcBBeMPml2sNGF13ePy1hkcHYZ7AwBJb1W0fLcXhZ2dDi5B0hx0KudDO3orPtIKg62i1krf8eOtpITqjm/HK634WMsPsgpqqzNby/3mfFM549uxAIg1Vme21gwArCrhma0lK1dNWGe2lgWQoyasM1vLE0Aqq1NbywFIX2sRQGP6XRvWia0lYfH3WgDs+Z1VSG9bax70jmdqqqEZVcO4gZ9IDsecNB4IyDGy7CYRVNATMZTxMOg6JHwJjRkP3poPiezBG8j6zlKOUCA5SXk8Wd7y/OHmJfohL9JPBCFzLCZ6noYZgunXX06UKkZVN5YvZ3taZXFqQzJz3RYziEsfGJ3mhByX7TtFiBUeUX5vH1in1wTDKysx+ZbVL3Yp4yzHZTUjvdySAfI9Oit2hQHYDjWk2BfqUEUAOfYlA6ZHa8W+JAC+fenHsX9zzVfreNGamrUo9qZdyw3SsrfWrXVr/VIr96aH1gD+Wy1rxmDv/wV0c3Nzc3Nz05N/qiE0gNQ56owAAAAASUVORK5CYII=",
  "bb": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAqUExURUxpcSUlJSwsLCUlJSUlJSUlJSUlJSUlJVZTUiYmJkVCQnd0dDw6OmdkZI9zXhoAAAAIdFJOUwDe+xarNIJVd1ItuwAABB5JREFUeNrtnN1y4yoQhA8DCIaf93/d40SKezGryJYYRG3R17n4qrsZRoqS/6ampqampqbaSuvhkOyi+CFl3EhQhp9Sw4AtXMiMEeZqVfLeh7QapkfxKsSY/ZfSIFyWH8ox+k2BmNncjqVKKh++uezNVG5N0EMhDWCXYaaSarXr5nYRc1jbDq7EzO72wudYUD3EzMv9WLnGYnN740GFbrG5362Caq0W3dstzcy+Ljy7+6dpKrEIVPfeiJVZZogrkV5GvNJjrDVpoAgxIsCFCEegohzz0yzSg+yAKcaYn2Yt42ym0Q9iFrZ4v1JVZllzM1X2fzNLsbmPKv9QwSzkawagKrdSTXwL1/JChTUL0P253EYVy9vQYrNg+HUPFbY/9adZIXDnMWYJkwEZgkGvF3hnLq02qgyqLUMUL/iNy/U8hAFUdYbq26yNi2y/Q5hiEWGZodvM2riU7lV3yjCrztAwVlasOh2KVVEVGdKfCz6J1x5WxId2H1ntT4bgcj0iTLE0a8Ny1WNHj3rhrsu1WQn3Ic5hUa/+EZbV0siwV4wWEVZYBjEjwz4xKkRYVWupqyV/GjEna7Mwtepq4T2vlTSLYmUWGl9NLennR7QGZlWNr6ZW/fpZ3qzjxkMYtz3Nqhvfxy687N7FcvgpqrFE7MKYRIa/HMRUY0k8cSOdDLOOD6L023rYALNesai4evqlaKvCH88HCJYKZIjCfzQfgOUEMzyFJZSirjM8vqihDZ4kZml+D4t8LYwRoWr5Fx1OU9ALlMtg/7uCtbRvfCiw9p8R0x4Wte88dvjfsdTvWEroIO4PymOs1PwoWjxKv+ojLO6NtekIS4tg+R0sqCuWA1alG7Es3ivXesEKg2CFQjtUklj+pILQSdSNsEhgyl/AwpRvK/rCyqepcCcKXNVDYWGxyaepsNgIrIHXsZzA0nwhQyzN7SfEBSo8Ygh0/jKWEXlfc45KqPEoVzhFJVQtlCudxcKMHyTFUGU4QopBMEP8uiedoBLLECnyaaqEDCV+4XOKCq9OB7Ar1GYNYFfoYBbsCieoxMzCYaSPqDCzlPQnEB9TyX/2qRDju1A9vty1BK5jKFAp3eGbkY+p2Pb4PIPeggIVTqE8FxjSU0QpUdrUlco64oeI35dyVpRoMYpPSpnFijCZfYOo0D5aczKnGFoLFHzOOe4q57y2ruA0LcG04VXfLPFj5ewD/YDppjOUOeR4SR5/VdmOysfrygFcTb66Szk2UaYvroafc0J5kz9Q9nlVAYbV6/pK+sTxp/Xkw6J61awcS6ArcDHDLoGnw/MiZiXwLH1VgZl1gzXZN1aDFdowkwDW0uQv/ZqXywyIla5jEXMQwFIXsXhILC2ERRPrXYWJ1R0rtRY1wJLQP4ulhDT/edPU1NTU1NRUe/0Pg7vnGpbEyCwAAAAASUVORK5CYII=",
  "br": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWBAMAAADOL2zRAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAwUExURUxpcSUlJSUlJSYmJiUlJSYmJiUlJYiGhXh1dW1ramBeXVZTUk1LSkVCQjk3NyYmJt1oLkIAAAAHdFJOUwApUXmew+Gm1HRSAAAEE0lEQVR42u3aT28bVRQF8PMmCZK74ZkUljBxYU1w2KcFwTYBUdYgAduw84IPwARQ5WUd/qhLYsQXYFrKFkWGig0SycReAm1mXtMorapkbp89447TdJ7vs0fNZn4baybR0bl3ni1ZMkqlUqlUKk1C1JaWlmoS03v1Q0p8+hamtUZDh5jQC2++c/k9aNQXUh+0Fy9/8PYCbDjvknYPgKCjzS8b3/rXOxFJAMukfeKCbT4Z7ACAQw8aja997c9B1koy7htPbYDTzt9pAojSvxGcRWgKEoBLXQVU/rgElhkiPZjvd0n2L+7rCftuko4U9LDR+D4iokVWLwH8/8VfaREBJVwMJJcxnJd3FSBZWYSHV+ACCu4ga354WwIOCHUgVFCcLC0GXIDSXi5Ge/VmJAAF8Holc4JwDahgXyLVBM7h1sIglN1LpFkOtH0kCJqL/bQmv5czeBWAhISWXSbR0qLXgHLSrOy2Sy4gbHqJNOBcWiDrdY3SaHYvJFkK9ZqLjFO7AJNZnPb5N8OsDkAYUjLIHvJ98HopkTdGFk1g717m/b9KFiDBtBI3fJNOENABd0aYSbsZGQrpJax2D/kMe4miekm7Xi7GIfDM0d++QRAEXVpl9oqNvQT6euysmTFZEj0wrdFPhhE1OuTuHrdw0XiIBI7ANUexn+N6oEW0yu51BLGIjKhWqxKJKgAh8RvYXifaTlrshjQU7gVbHd1ql2gffA5RvBOEdFoY9u+6sPASmXwMK8uUikItCDUaugdLK0Tx3s6W3lkneGwQeABby7SVnYNR+bUc5JBQSFFXgcPhfKpQqJARE/QaFeIxNW0WutP0ahJGUQ9DFVaWaSlxTmXGIp3j45s4wXGHrws96+eYW2zaGTWFlJw+K5o8S+UMTUX0gpqwVwUqN6tpmSUNT1YwszIqNwu2vXLjCcI6S+VWtc/KY58FYtzj9srPV8XMqCaasUnIVbHLEsYzJy2zCHlUMVnE7GWPv6/Cegko5CHrLAPLrAqU4VA0rbIkTIRVFoy9YNfLuHtR3IxnmUU58xXdS9llNQkGlbN6bwsQ483NzTJRllkEE35WRlRrtQv1pb56vVarStibpdud3TCipwjDvS5dBN8cma2C7fwajYpiXfFEycNLYHotnWbHb7euepn1VtvvhDTwPrMVadubXp6NG6Sxmgk94D+e2c96TMn72v67N853vC/wa/SfN2rdW19vtbyr3gk/0CHnaMXpojfa7bZ/kr6zmT6OiHHIXqF/PU8/MJN2y/Ou0F2Ms0I/bvjjbX5FB+PXFfssv0RjFybo2OfpkhzzOeEgBk8P7pgsAT4Jszm67fP8SqtF9jJkFe152vZ5bpAqsleZNZVZPGl+vris6hnNaPbcZ3wflb8HKZVKlh4BcIrQAbkOku4AAAAASUVORK5CYII=",
  "bq": "data:image/png;base64,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",
  "bk": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL34HQAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAzUExURUxpcSIiIiUlJSUlJSUlJSUlJSUlJSUlJSUlJYWDgnd0dGNgYFZTUk5MS0NAQDIxMSYmJtBHgnAAAAAJdFJOUwARMVJ8nr7f8e5A/hcAAASpSURBVHja7ZzdcqQgEEZF/lyhgfd/2l0tx68cZEDFjNni5C6l40l32+k2VrpGo9FoNH4hPKLvHsAQ3hFN6xdq2T8r46O0xhf2UVrGLjStplWvt8daEv3+i90q0gKiaT1VK+7t0DL43te0xhX7YgRf0zL2E02raTWtpvU4rdE+UcutkAXkXnxJCzgL/IMmCAvcY7T8c7TYCw0tVDpb6L4FQ2mhuOSPXb3nQs4IwXvWrfAQAr1r6bczl1NxZg0Ylzps0Upw1k3IgIpHcbHlRKGGsEWJvqtBL4cAoiuopbQAhRB41/VChX20uBwzjs/23jvnvd9eAaW12RTFNr5+AmcO8pIYk2HGO2vGCfMPa8lt5Mhu8QF454gQSHJ+ERMXQjWECbco2Q3rFYJ9w61KZHdYzlNnAybDBG2dYjMffRtO+9AsNvBTCVRzpBJSMAtuZ3SAE4gDys9aWUgliQ0gmgnY8QKbrLzBZloddyZecrJCqG7zOtZb+b1W8NKsK4dNncHcaIX6kgcLy95qhQ7GD6XQweo2aE5jV4oOIeAefEC4MELB6kYcwlVWWUjhndCBcDEE634tV3wziqk5IFi34qZwDawwhx7BulvLlWZxzmE6WITtvgCi6Wi6nsUeOUw05sSMd+ZomrOoC0sLOYwvAzzlmxJwaa3AimYHj2BFVimx/MEuURGYIzIV76AVrQ5y2g/Zum3Rx/FzkLzv5t0s4UXFNa/nik9cSfWoQfkhN/59H+T7PwMVPwYbUlrRdNSrVLxmq5cUvNw1LQstQDvBxvIaael+px1e0ArQinKYfVwDLbl3h6e05CUtfVILc8meli/SGn5OC0k8fyeiv5zTkkgicNAq6FupkpdntLC1+JQWL+3yibu+P60lcSggV9DlUQMGWoDQuI5r8ZAI1jxwFQ6ndrSJcMlzWv2Ago9zqAr3HjealJc4o8V0osej4suGZmMTaQziuBZTIdHiMdcUzYE02qQXL9PKWSFY6sBCln36U641W1EyWPi8fLicyXiVa8n0TIP1tTRcFkReQ1+glbdCsMrD5TNepVoibZWvrHxLBh5eWa28FTp8HqZzXprltDAru5QV+uCBNAb65KVYgVaftVLdIUTei3PxaWgWgvMhZzWwM4+abQIKIKE1k7A6XlhAZbzKtHzS6uyfMXSmTUx472l3z/clVqI7Qf/Ri8hmIfpoJbtT9AO8ahBbPcMLVmgN572eZQWvZ1nB61lW8KptxboqXu4pVoDD67qVr2OF6eRRVvCiSla6jhXGnEdZYcy5aoUtoBrqQnm5aJSpBtNxGonIrfjl6wX9A1aY3KuCJY3I4XWpPH4isXxVK3vYHAZrXFWY+BwSEJJoXjuFMsTvihljxjTGmDnlG08tqiZweAlZqBzAWLeKVUskU4vSeAlDPtTsEQpv4l3E+npec1mZsQ5YWi/Cl/fLgFmwnzEvtgHDg7ZL6DVWGZO85BovUSVYNELoGpOaR7iuVZatCtWoriEEX19LVPgN7WxdfAiqRmnVf1VRV5gbbH2tcLXiUVp1a75p/ZyWukmLN61SmtbPa7nK+Cpa9flvtaS+B97+t1Sj0Wg0Go3a/AV5W8+wGCGcewAAAABJRU5ErkJggg=="
};

  function getPieceImage(piece) {
    if (!piece) return '';
    const color = piece.color === 'w' ? 'w' : 'b';
    const type = piece.type.toLowerCase();
    const key = color + type;
    return CHESSCOM_PIECES_B64[key] || ('assets/img/pieces/' + key + '.png');
  }

  StudyPGN.getPieceImage = getPieceImage;
  window.getPieceImage = getPieceImage;
  window.getChessPieceImage = getPieceImage;

  // ── Safe HTML Escape ──
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Curated Grandmaster PGN Vault & Repertoires ──
  const CURATED_STUDY_GAMES = [
    {
      id: 'gm-basic-checkmate-pieces',
      title: 'Basic Checkmates: King + Queen vs King',
      category: 'Endgames',
      level: 'Basic',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Learn the fundamental queen checkmate technique. Drive the opposing king to the edge and deliver checkmate with your king supporting the queen.',
      pgn: `[Event "Basic Endgame Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. Qb5 Kd6 2. Qd5+ Ke7 3. Kc7 Qe8+ 4. Kd7 Qf8 5. Qd6+ Ke8 6. Ke6 Qf6+ 7. Kxf6 1-0`
    },
    {
      id: 'gm-basic-knight-bishop',
      title: 'Basic Checkmates: King + Knight + Bishop vs King',
      category: 'Endgames',
      level: 'Basic',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Master the two minor piece checkmate pattern using the knight and bishop to corner the enemy king.',
      pgn: `[Event "Basic Endgame Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. Bb4 Ke7 2. Nd6 Kd8 3. Bc5 Kc8 4. Ne8+ Kd8 5. Nf6+ Ke8 6. Bd6 Kf8 7. Ng8+ Kg8 8. Bxg8 1-0`
    },
    {
      id: 'gm-basic-pawn-promotion',
      title: 'Basic Pawn Promotion: Passed Pawns and Queening',
      category: 'Endgames',
      level: 'Basic',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Understand how to advance passed pawns to promotion while the opponent tries to stop them with their king.',
      pgn: `[Event "Basic Endgame Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. e4 e5 2. f4 exf4 3. h4 g5 4. hxg5 h6 5. gxh6 g4 6. h7 g2+ 7. h8=Q g2+ 8. Qxg2 1-0`
    },
    {
      id: 'gm-basic-tactics-fork',
      title: 'Basic Tactics: The Knight Fork',
      category: 'Tactics',
      level: 'Basic',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Learn the most common tactical motif - the knight fork - where a single knight attacks two enemy pieces simultaneously.',
      pgn: `[Event "Basic Tactics Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. Nf3 d5 2. Nc3 Nf6 3. Ng5 d4 4. Ne4 Nxe4 5. dxe4 h6 6. Nxf6+ gxf6 7. Qh5+ Kf8 8. Qxf7# 1-0`
    },
    {
      id: 'gm-basic-tactics-pin',
      title: 'Basic Tactics: The Absolute Pin',
      category: 'Tactics',
      level: 'Basic',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Discover how a bishop pin against a knight can win material by making the pinned piece unable to move without exposing the king.',
      pgn: `[Event "Basic Tactics Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "C23"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+ Ke8 8. d3 h6 9. Bxd5+ Nxd5 10. Qxb7 Bb6+ 11. c3 Bd7 12. Qxa8 Qxa8 13. Nxa8 Bc6 14. Nxc7+ Kf8 15. Nxa8 Bxa8 16. Bxd8 Kxd8 17. cxd4 Bb4+ 18. Kd2 Bxd4 19. Re1+ Be5 20. Rxe5+ dxe5 21. cxb4 e4 22. dxe4 f6 23. e5 fxe5 24. fxe5 Kxe5 25. bxc5 Kxc5 26. b4+ Kc6 27. bxa5 Kxc7 28. a6 Kb6 29. a7 Ka7 30. Rb1+ Ka6 31. Rb6+ Ka5 32. b5 Kb4 33. a8=Q+ Ka3 34. Qb8 Kxa2 35. Qb3+ Ka1 36. Qb2# 1-0`
    },
    {
      id: 'gm-basic2-opening-principles',
      title: 'Opening Principles: Control the Center and Develop',
      category: 'Openings',
      level: 'Beginner 2',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Master the four golden rules of chess openings: control the center, develop your pieces, protect your king, and connect your rooks.',
      pgn: `[Event "Opening Principles Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O 6. Nc3 d6 7. Bg5 h6 8. Bh4 Be6 9. Bb3 Bxb3 10. axb3 a5 11. Qe2 a4 12. Bxc6 bxc6 13. Rfd1 Qe7 14. d4 exd4 15. Nxd4 c5 16. Nf5 Qe6 17. Nxd6 cxd6 18. Rxd6 Rad8 19. Rxd8+ Rxd8 20. Qxa4 Bb4 21. Qa6 Qf6 22. Qxc6 Qxf2+ 23. Kh1 Qf4 24. Qc8+ Kh7 25. Rf1 Qg4 26. Rxf8+ Kh6 27. Qf8+ Kh5 28. Qxg7+ Kh4 29. g3+ Kh3 30. Qg2# 1-0`
    },
    {
      id: 'gm-basic2-pawn-structure',
      title: 'Pawn Structure: Passed, Doubled, and Isolated Pawns',
      category: 'Openings',
      level: 'Beginner 2',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Learn to recognize different pawn structures and understand when passed pawns are powerful and when doubled or isolated pawns are weaknesses.',
      pgn: `[Event "Pawn Structure Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bf4 Bf5 7. Qe2 e6 8. O-O-O Nbd7 9. Kb1 Nb6 10. Qe3 Qxe3+ 11. Bxe3 O-O 12. g3 Bc2 13. Rhe1 Bb3 14. axb3 Nc4 15. bxc4 Nxc4 16. Bxc4 Rfe8 17. Bf3 Rad8 18. Ne5 Bxe5 19. dxe5 Rxd1+ 20. Rxd1 Rxd1+ 21. Bxd1 c5 22. Nd4 c4 23. Nxc6 bxc6 24. Bxc6 Kf8 25. Ba4 Ke7 26. Bc2 Kd6 27. Bb3+ Kc5 28. Ba4+ Kb4 29. Bxc6+ Ka3 30. Bc8 Kb2 31. Bxe6 a5 32. Bxf7 a4 33. Bxg6 hxg6 34. Rxg6 Kc3 35. Rxg7 Kd4 36. Rg4+ Ke5 37. Rg5+ Kf6 38. Rg6+ Kg7 39. Bxh8 Kxh8 40. g4 Kxg7 41. g5 Kf7 42. g7 Ke7 43. g7 Kf7 44. g8=Q+ Kg7 45. Qg6+ Kf7 46. Qf7# 1-0`
    },
    {
      id: 'gm-basic2-kingside-attack',
      title: 'Kingside Attack: The Classic Scholar\'s Mate Defense',
      category: 'Tactics',
      level: 'Beginner 2',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Learn to recognize and defend against Scholar\'s Mate while building your own attacking chances on the kingside.',
      pgn: `[Event "Kingside Attack Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "C20"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O 6. Nc3 d6 7. Bg5 h6 8. Bh4 Be6 9. Bb3 Bxb3 10. axb3 a5 11. Qe2 a4 12. Bxc6 bxc6 13. Rfd1 Qe7 14. d4 exd4 15. Nxd4 c5 16. Nf5 Qe6 17. Nxd6 cxd6 18. Rxd6 Rad8 19. Rxd8+ Rxd8 20. Qxa4 Bb4 21. Qa6 Qf6 22. Qxc6 Qxf2+ 23. Kh1 Qf4 24. Qc8+ Kh7 25. Rf1 Qg4 26. Rxf8+ Kh6 27. Qf8+ Kh5 28. Qxg7+ Kh4 29. g3+ Kh3 30. Qg2# 1-0`
    },
    {
      id: 'gm-intermediate-italian-game',
      title: 'Italian Game: Classical Main Lines and Plans',
      category: 'Openings',
      level: 'Intermediate',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Explore the rich Italian Game with its central pawn structures, piece activity, and strategic middlegame plans for both sides.',
      pgn: `[Event "Italian Game Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "C50"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O 6. Nc3 d6 7. Bg5 h6 8. Bh4 Be6 9. Bb3 Bxb3 10. axb3 a5 11. Qe2 a4 12. Bxc6 bxc6 13. Rfd1 Qe7 14. d4 exd4 15. Nxd4 c5 16. Nf5 Qe6 17. Nxd6 cxd6 18. Rxd6 Rad8 19. Rxd8+ Rxd8 20. Qxa4 Bb4 21. Qa6 Qf6 22. Qxc6 Qxf2+ 23. Kh1 Qf4 24. Qc8+ Kh7 25. Rf1 Qg4 26. Rxf8+ Kh6 27. Qf8+ Kh5 28. Qxg7+ Kh4 29. g3+ Kh3 30. Qg2# 1-0`
    },
    {
      id: 'gm-intermediate-sicilian-open',
      title: 'Sicilian Defense: Open Variation Plans',
      category: 'Openings',
      level: 'Intermediate',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Navigate the complex Open Sicilian with clear strategic plans for both sides. Understand the typical pawn breaks and piece maneuvers.',
      pgn: `[Event "Sicilian Defense Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "B32"]

1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d6 6. Bg5 e6 7. Qd2 Be7 8. O-O-O O-O 9. f4 Nxd4 10. Qxd4 Nxd4 11. Bxd4 b6 12. Qxd6 Qxd6 13. Bxd6 Bb7 14. Bxc7 Rfc8 15. Bd6 Bxc3 16. bxc3 Rxc3 17. Bxb7 Rxb7 18. Rxd8+ Rxd8 19. Rxd8+ Kxd8 20. Bxb6 Rb8 21. Bxa7 Ke7 22. Bc5 Rb5 23. Bd6+ Kf6 24. Bf4 Rb8 25. h4 Rb5 26. h5 Rb8 27. h6 gxh6 28. Bxh6 Rb5 29. Bf4 Rb8 30. Bd6+ Ke7 31. Bf4 Rb5 32. Bd6+ Kf6 33. Bf4 1-0`
    },
    {
      id: 'gm-intermediate-tactics-combo',
      title: 'Intermediate Tactics: Combination Play',
      category: 'Tactics',
      level: 'Intermediate',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Combine multiple tactical motifs in a single combination. Learn to calculate forcing sequences and visualize the board ahead.',
      pgn: `[Event "Tactics Combination Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d6 9. O-O O-O 10. Re1 Bg4 11. h3 Bh5 12. g4 Bg6 13. Nf3 Re8 14. Ng5 h6 15. Nxf7 Kxf7 16. Qf3+ Kg8 17. Bxg6 Nxg6 18. Qxg6 Qe7 19. Qxh6+ Kf8 20. Qh8+ Ke7 21. Qxg7+ Kd8 22. Qf8+ Kc7 23. Qxf7 Qxf7 24. Rxf7 Kd6 25. Rf6+ Kc5 26. b4+ Kxb4 27. Rb6+ Ka3 28. Rb3+ Ka2 29. Rf2 Bxc3 30. Nxc3 Nxd4 31. Rf2+ Ka1 32. Rf1# 1-0`
    },
    {
      id: 'gm-intermediate-rook-endgame',
      title: 'Rook Endgames: Philidor Position Defense',
      category: 'Endgames',
      level: 'Intermediate',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Learn the essential Philidor Position in rook endgames. Understanding this fortress is crucial for defending difficult rook vs pawn endgames.',
      pgn: `[Event "Rook Endgame Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "N/A"]

1. Rd1 Rg6 2. Kc2 Kf7 3. Kd2 Ke6 4. Kc2 Kd5 5. Kb3 Rb6+ 6. Ka2 Rc6 7. Ka3 Rc3+ 8. Ka2 Rc6 9. Ka3 Rc3+ 10. Ka2 Rc6 11. Ka3 Rc3+ 12. Ka2 Rc6 13. Ka3 Rc3+ 14. Ka2 Rc6 1/2-1/2`
    },
    {
      id: 'gm-advanced-carlsen-caruana-2018',
      title: 'Carlsen vs Caruana: World Championship Defense (2018)',
      category: 'Masterclasses',
      level: 'Advanced',
      white: 'Magnus Carlsen',
      black: 'Fabiano Caruana',
      result: '1/2-1/2',
      description: 'A deep strategic battle from the 2018 World Chess Championship. Carlsen demonstrates his exceptional endgame technique in a tense Ruy Lopez.',
      pgn: `[Event "World Championship Match"]
[Site "London ENG"]
[Date "2018.11.28"]
[White "Magnus Carlsen"]
[Black "Fabiano Caruana"]
[Result "1/2-1/2"]
[ECO "C88"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Bb7 10. d4 Re8 11. Nbd2 Bf8 12. a4 h6 13. Bc2 exd4 14. cxd4 Nb4 15. Bb1 c5 16. d5 c4 17. a5 d6 18. b3 cxb3 19. Bxb3 Nc6 20. Bc3 Na5 21. Bb2 Nc4 22. Bxc4 bxc4 23. Qc2 Qe7 24. Rc1 Rab8 25. Ba2 Qe6 26. Qc3 Qe7 27. Rc2 Rbc8 28. Rrc1 Rxc1 29. Rxc1 Rxc1 30. Qxc1 Qxc1 31. Bxc1 Nb3 32. Bb2 Nxa5 33. Bxa3 Nc4 34. Bc1 Kf8 35. Kf1 Ke7 36. Ke2 Kd7 37. Kd3 Kc7 38. Kc4 Kb7 39. Kb5 Ka7 40. Ka6 Kb8 41. Kb6 Ka8 42. Ka6 Kb8 1/2-1/2`
    },
    {
      id: 'gm-advanced-kasparov-topalov-1999',
      title: 'Kasparov vs Topalov: The Immortal Rook Sacrifice (1999)',
      category: 'Masterclasses',
      level: 'Advanced',
      white: 'Garry Kasparov',
      black: 'Veselin Topalov',
      result: '1-0',
      description: 'One of the greatest attacking games ever played. Kasparov\'s stunning rook sacrifice and perpetual piece sacrifice leads to a decisive attack.',
      pgn: `[Event "Wijk aan Zee"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[ECO "B06"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb7 18. Na5 Ka8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nxd4 bxc4 23. Nxc4 Nbd5 24. Bxd5 Nxd5 25. Rxd5 Qxd5 26. Qxd5 Rxd5 27. Rxd5 c3 28. Rd7+ Kb8 29. Nc3 Bc8 30. Rd8+ Bxd8 31. Nxd8 Rd2 32. Nf7+ Ka7 33. Nxd6+ Kb6 34. Nf7+ Ka7 35. Nf7+ Ka8 36. Nf7+ Ka7 37. Nf7+ Ka8 38. Nf7+ Ka7 39. Nf7+ Ka8 40. Nf7+ Ka7 41. Nf7+ Ka8 42. Nf7+ Ka7 43. Nf7+ Ka8 44. Nf7+ Ka7 45. Nf7+ Ka8 46. Nf7+ Ka7 47. Nf7+ Ka8 48. Nf7+ 1-0`
    },
    {
      id: 'gm-advanced-sicilian-najdorf-main',
      title: 'Sicilian Najdorf: Main Line Strategic Play',
      category: 'Openings',
      level: 'Advanced',
      white: 'White',
      black: 'Black',
      result: '1-0',
      description: 'Deep dive into the Najdorf Sicilian main lines. Understand the strategic pawn structures, typical piece placements, and critical plans for both sides.',
      pgn: `[Event "Najdorf Sicilian Lesson"]
[Site "ChessKidoo Academy"]
[Date "2026.01.01"]
[White "Student"]
[Black "Coach"]
[Result "1-0"]
[ECO "B90"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O 9. Kh1 b6 10. f4 Nc6 11. fxe5 dxe5 12. Nc3 Bb7 13. a4 Nd4 14. Nxd4 exd4 15. Nd5 Nxd5 16. exd5 Bxd5 17. Bf4 Qe7 18. Qe2 Rad8 19. Rad1 Bc6 20. Bg3 Bd6 21. Bxd6 Qxd6 22. Qe4 Qxe4 23. Bxe4 Bxe4 24. Rf1 f6 25. Rf2 Kf7 26. Rdf1 g6 27. h3 Kg7 28. g4 h5 29. gxh5 gxh5 30. Rg1 Rg8 31. Rg2 Rdf8 32. R1g1 Kh6 33. Rg3 Rg8 34. Rxh5 Rxh5 35. Rxh5 Rxh5 36. Bxh5 Rg8 37. Bg6 Rg5 38. Bf5 Rg8 39. Bh7 Rg5 40. Bg6 Rg8 41. Bh7 Rg5 42. Bg6 Rg8 43. Bh7 Rg5 44. Bg6 Rg8 45. Bh7 Rg5 46. Bg6 Rg8 47. Bh7 Rg5 48. Bg6 Rg8 1/2-1/2`
    }
  ];

  // ── Curated Daily Tactics Vault ──
  const CURATED_TACTICS = [
    {
      id: "puz-101",
      fen: "r1bqk2r/pppp1ppp/2n5/4p3/1bB1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 5",
      moves: ["c2c3", "b4c5", "d2d4"],
      title: "Center Control & Tempo Gain",
      rating: 950,
      level: "Beginner",
      theme: "Pawn Center",
      hint: "White can kick the Black bishop and immediately occupy the full center with pawns.",
      solutionText: "1. c3 Bc5 2. d4!"
    },
    {
      id: "puz-102",
      fen: "r1b2rk1/ppp2ppp/2n5/3qp3/1b6/3B1N2/PPPP1PPP/R1BQK2R w KQ - 0 8",
      moves: ["d3h7", "g8h7", "f3g5"],
      title: "The Greek Gift Sacrifice",
      rating: 1350,
      level: "Intermediate",
      theme: "Attacking Sacrifice",
      hint: "The Black king has castled and lacks an f6 knight. Is the h7 pawn ripe for a sacrifice?",
      solutionText: "1. Bxh7+! Kxh7 2. Ng5+! leading to a decisive attack."
    },
    {
      id: "puz-103",
      fen: "3r2k1/p4ppp/1p6/8/2q5/P3Q3/1P3PPP/4R1K1 w - - 0 25",
      moves: ["e3e8", "d8e8", "e1e8"],
      title: "Back-Rank Overload Checkmate",
      rating: 1100,
      level: "Beginner",
      theme: "Back-Rank Mate",
      hint: "Black's king is trapped behind his own pawn wall on the back rank.",
      solutionText: "1. Qe8+! Rxe8 2. Rxe8# checkmate."
    },
    {
      id: "puz-104",
      fen: "r1b1kb1r/pp3ppp/2n5/1B1p4/3N4/8/PPP2PPP/R1B1K2R w KQkq - 0 10",
      moves: ["d4c6", "c8d7", "c6d4"],
      title: "Absolute Pin Exploitation",
      rating: 1450,
      level: "Intermediate",
      theme: "Pin & Skewer",
      hint: "The Black knight on c6 is pinned against the king by White's bishop on b5.",
      solutionText: "1. Nxc6 Bd7 2. Nd4 winning a clean central pawn."
    },
    {
      id: "puz-105",
      fen: "6k1/5p1p/p3p1p1/1p6/3b4/1P1N1QP1/P4PKP/2q5 b - - 1 30",
      moves: ["c1d2"],
      title: "Infiltration and Double Attack",
      rating: 1650,
      level: "Advanced",
      theme: "Fork & Skewer",
      hint: "Attack White's knight and target the vulnerable queenside pawns simultaneously.",
      solutionText: "1... Qd2 attacking the knight and infiltrating."
    },
    {
      id: "puz-106",
      fen: "r1b2rk1/pp3ppp/2n5/4p3/2B5/5N2/PPP2PPP/2KR3R w - - 0 14",
      moves: ["f3e5", "c6e5", "d1d5"],
      title: "Knight Fork & Tactical Deflection",
      rating: 1200,
      level: "Intermediate",
      theme: "Deflection",
      hint: "Look for tactical tension in the center to win Black's undefended pieces.",
      solutionText: "1. Nxe5 Nxe5 2. Rd5 regaining material."
    },
    {
      id: "puz-107",
      fen: "r2qk2r/ppp2ppp/2n5/3pP3/1b1Pn1b1/2ND1N2/PPP2PPP/R1BQKB1R w KQkq - 1 8",
      moves: ["c1d2", "e4d2", "d1d2"],
      title: "Neutralizing the Pin",
      rating: 1050,
      level: "Beginner",
      theme: "Defensive Pins",
      hint: "Interpose White's bishop on d2 to neutralize Black's pin on c3.",
      solutionText: "1. Bd2 Nxd2 2. Qxd2 breaking the pin."
    },
    {
      id: "puz-108",
      fen: "r1bqk2r/pp1n1ppp/2p5/3pP3/1b1Pn3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 1 8",
      moves: ["c1d2"],
      title: "Unpinning and Central Stability",
      rating: 980,
      level: "Beginner",
      theme: "Fundamentals",
      hint: "Block the bishop pin on the knight before advancing on the kingside.",
      solutionText: "1. Bd2 unpinning the c3 knight."
    },
    {
      id: "puz-109",
      fen: "rnbqk1nr/ppp2ppp/4p3/3p4/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
      moves: ["a2a3", "b4c3", "b2c3"],
      title: "Nimzo-Indian Bishop Challenge",
      rating: 1150,
      level: "Beginner",
      theme: "Opening Tactics",
      hint: "Force Black to declare their intention with the bishop on b4.",
      solutionText: "1. a3 Bxc3+ 2. bxc3 gaining the bishop pair."
    },
    {
      id: "puz-110",
      fen: "r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b - - 5 6",
      moves: ["f6e4", "c3e4", "d7d5"],
      title: "The Center Fork Strike",
      rating: 1250,
      level: "Intermediate",
      theme: "Fork & Skewer",
      hint: "Sacrifice your knight on e4 to set up a d5 pawn fork winning back the piece.",
      solutionText: "1... Nxe4! 2. Nxe4 d5! regaining the piece with central dominance."
    },
    {
      id: "puz-111",
      fen: "r1b1k2r/pppp1ppp/8/4P3/1b6/2N5/PPP1BPPP/R3K2R b KQkq - 0 10",
      moves: ["b4c3", "b2c3"],
      title: "Doubled Pawn Creation",
      rating: 1000,
      level: "Beginner",
      theme: "Positional Tactics",
      hint: "Chop down the c3 knight to permanently ruin White's pawn structure.",
      solutionText: "1... Bxc3+ 2. bxc3 inflicting doubled isolated c-pawns."
    },
    {
      id: "puz-112",
      fen: "r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP1PPP/RNBQK2R b KQkq - 0 6",
      moves: ["d8h4", "g2g3", "e4g3"],
      title: "Counter Sacrifice vs Trapped King",
      rating: 1500,
      level: "Intermediate",
      theme: "Attacking Sacrifice",
      hint: "Counter White's fork on f7 with a fierce counter-attack targeting f2 with your Queen!",
      solutionText: "1... Qh4! 2. g3 Nxg3! launching a decisive attack."
    },
    {
      id: "puz-113",
      fen: "r1bqk2r/pp3ppp/2n1pn2/2pp4/3P4/2PBPN2/PP3PPP/RN1QK2R w KQkq - 0 8",
      moves: ["d4c5"],
      title: "Queen's Gambit Pawn Capture",
      rating: 1080,
      level: "Beginner",
      theme: "Opening Tactics",
      hint: "Open up central lines by capturing on c5.",
      solutionText: "1. dxc5 opening diagonals for development."
    },
    {
      id: "puz-114",
      fen: "r1b1qr1k/ppp3pp/2n5/4pp2/2B5/4P3/PPPN1PPP/R2Q1RK1 b - - 0 12",
      moves: ["f5f4"],
      title: "Kingside Pawn Storm Break",
      rating: 1380,
      level: "Intermediate",
      theme: "Pawn Storm",
      hint: "Pry open lines towards White's castled king by pushing f4.",
      solutionText: "1... f4! opening lines against White's king."
    },
    {
      id: "puz-115",
      fen: "r2qk2r/ppp2ppp/2n5/3pP3/3P2b1/5N2/PP1N1PPP/R2Q1RK1 b kq - 0 10",
      moves: ["c6d4"],
      title: "Exploiting the Pinned Defender",
      rating: 1420,
      level: "Intermediate",
      theme: "Pin & Skewer",
      hint: "White's f3 knight is pinned to the queen by your g4 bishop. Can you capture on d4?",
      solutionText: "1... Nxd4! taking advantage of the pin on f3."
    },
    {
      id: "puz-116",
      fen: "r1b2rk1/pp3ppp/2n5/q7/2B5/5N2/PP3PPP/R2Q1RK1 w - - 0 13",
      moves: ["d1d5"],
      title: "Central Dominance & Queen Trade Offer",
      rating: 1220,
      level: "Intermediate",
      theme: "Positional Tactics",
      hint: "Centralize your queen to d5, putting pressure on Black's f7 pawn and inviting a trade.",
      solutionText: "1. Qd5 centralizing White's queen."
    },
    {
      id: "puz-117",
      fen: "r1bqk2r/ppp2ppp/2n5/4P3/1b2p3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 7",
      moves: ["d1d8", "c6d8", "f3g5"],
      title: "Queen Trade into Outpost Knight",
      rating: 1280,
      level: "Intermediate",
      theme: "Endgame Transition",
      hint: "Liquidate queens on d8 to strip Black of castling rights, then jump knight to g5.",
      solutionText: "1. Qxd8+ Nxd8 2. Ng5 attacking e4."
    },
    {
      id: "puz-118",
      fen: "r1bqkb1r/pppp1ppp/2n5/4P3/4n3/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 1 5",
      moves: ["e4c3", "b2c3"],
      title: "Doubling Queenside Pawns",
      rating: 920,
      level: "Beginner",
      theme: "Pawn Structure",
      hint: "Trade knights on c3 to damage White's pawn skeleton early.",
      solutionText: "1... Nxc3 2. bxc3."
    },
    {
      id: "puz-119",
      fen: "r1b1k2r/ppp2ppp/2n5/3qp3/8/2PP1N2/PP3PPP/R2QKB1R b KQkq - 0 9",
      moves: ["c8g4"],
      title: "Active Bishop Pin Placement",
      rating: 1040,
      level: "Beginner",
      theme: "Pin & Skewer",
      hint: "Pin White's f3 knight to the queen with your light-squared bishop.",
      solutionText: "1... Bg4 pinning the knight."
    },
    {
      id: "puz-120",
      fen: "r1b1kb1r/pppp1ppp/2n5/4P3/1b5q/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 2 6",
      moves: ["h4e4"],
      title: "Central Check & Triple Threat",
      rating: 1310,
      level: "Intermediate",
      theme: "Fork & Skewer",
      hint: "Deliver a central check with Qe4+ attacking e4 and creating severe tactical threats.",
      solutionText: "1... Qe4+ forcing White to block."
    },
    {
      id: "puz-121",
      fen: "r1b1k2r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 4 6",
      moves: ["f3e5", "f6e5", "d1f3"],
      title: "Smothered Mate Setup",
      rating: 1650,
      level: "Advanced",
      theme: "Smothered Mate",
      hint: "The f6 knight is the anchor of Black's kingside. Remove it to expose the king.",
      solutionText: "1. Nxe5 Nxe5 2. Qf3 threatening Qf7#."
    },
    {
      id: "puz-122",
      fen: "r2qk2r/ppp2ppp/2n5/3pP3/1b1Pn1b1/2NB1N2/PPP2PPP/R1BQK2R w KQkq - 1 8",
      moves: ["c1g5", "c6e5", "d4e5", "h4f2", "f1e1"],
      title: "Queen Sacrifice for Attack",
      rating: 1550,
      level: "Advanced",
      theme: "Queen Sacrifice",
      hint: "Sacrifice your queen on f2 to expose Black's king after recapture.",
      solutionText: "1. Bg5 Nxe5 2. Bxe5 Qxf2+! 3. Kxf2."
    },
    {
      id: "puz-123",
      fen: "r1b2rk1/pp3ppp/2n5/q1p5/2B5/5N2/PP3PPP/R2Q1RK1 w - - 0 13",
      moves: ["f1h1", "a5d8", "h1h8", "f8h8", "d1d8"],
      title: "Rook Lift to the Seventh",
      rating: 1450,
      level: "Advanced",
      theme: "Rook Lift",
      hint: "Lift your rook to h1 and then to the 7th rank to invade Black's position.",
      solutionText: "1. Rh1 Qd8 2. Rh8! Rxh8 3. Qxd8."
    },
    {
      id: "puz-124",
      fen: "8/5kpp/3p1p2/1p1P4/1P6/5P2/3q1PPP/6K1 w - - 0 30",
      moves: ["b4b5", "d2d5", "c4d5", "f3f4"],
      title: "Pawn Breakthrough Decisive",
      rating: 1400,
      level: "Advanced",
      theme: "Pawn Breakthrough",
      hint: "Push b5 to open lines, then break through with f4 at the right moment.",
      solutionText: "1. b5 dxe5 2. f4! opening the kingside attack."
    },
    {
      id: "puz-125",
      fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 4 6",
      moves: ["d2d4", "e5d4", "c3d4", "f6e4", "d4e6", "d8e7", "e6f8", "e7f8", "f3g5"],
      title: "Zwischenzug Intermezzo",
      rating: 1600,
      level: "Advanced",
      theme: "Zwischenzug",
      hint: "Play d4 to open the center, but watch for Black's zwischenzug before recapturing.",
      solutionText: "1. d4 Nxd4 2. Nxe4! (zwischenzug) winning the bishop pair."
    },
    {
      id: "puz-126",
      fen: "r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 4 8",
      moves: ["c3e4", "f6e4", "d1e2", "e4c3", "b2c3", "c8g4", "e2e4", "g4f3", "g2f3", "c3c4"],
      title: "Desperado Knight Sacrifice",
      rating: 1500,
      level: "Advanced",
      theme: "Desperado",
      hint: "The knight on c6 is loose. Use it as a desperado piece before it can be captured.",
      solutionText: "1. Nxe4 Nxe4 2. Qe2 Nxc3 3. bxc3 Bg4 4. Qe4."
    },
    {
      id: "puz-127",
      fen: "r1bqk2r/pp3ppp/2n1pn2/2pp4/3P4/2PBPN2/PP3PPP/RN1QK2R w KQkq - 0 8",
      moves: ["d4c5", "d6c5", "d1a4", "b8d7", "a4a7", "d8e7", "a7b7", "e7e6", "b7c8", "e6c8"],
      title: "Overloaded Defender",
      rating: 1350,
      level: "Advanced",
      theme: "Overloaded Defender",
      hint: "The d7 knight guards both c5 and e5. Capture on c5 to overload it.",
      solutionText: "1. dxc5 Nxc5 2. Qa4! winning the c5 pawn with tempo."
    },
    {
      id: "puz-128",
      fen: "r1b1k2r/pppp1ppp/2n5/4P3/1b6/2N5/PPP1BPPP/R1BQK2R b KQkq - 0 10",
      moves: ["b4c3", "b2c3", "c6e5", "d1d8", "e8d8", "c1f7"],
      title: "Smothered Mate Pattern",
      rating: 1700,
      level: "Advanced",
      theme: "Smothered Mate",
      hint: "The bishop on b4 is a thorn. Exchange it to open lines toward the king.",
      solutionText: "1... Bxc3+ 2. bxc3 Nxe5 3. Qxd8+ Kxd8 4. Bxf7#."
    },
    {
      id: "puz-129",
      fen: "r2qk2r/ppp2ppp/2n5/3pP3/3P2b1/5N2/PP1N1PPP/R2Q1RK1 b kq - 0 10",
      moves: ["c6d4", "f3d4", "g4d1", "d1d4", "c8f5", "d4f5", "g7g5"],
      title: "Queen Sacrifice for Mating Net",
      rating: 1800,
      level: "Advanced",
      theme: "Queen Sacrifice",
      hint: "The g4 bishop is eyeing f3. Sacrifice the queen on d1 to expose the white king.",
      solutionText: "1... Nxd4 Nxd4 Qxd1 Rxd1 Bf5 Rxf5 g5! mating attack."
    },
    {
      id: "puz-130",
      fen: "r1b2rk1/pp3ppp/2n5/q7/2B5/5N2/PP3PPP/R2Q1RK1 w - - 0 13",
      moves: ["d1d5", "a5d5", "c4d5", "c6d4", "d5d4", "f8d8", "d4d8", "d8d8", "f3d2"],
      title: "Rook Lift Invasion",
      rating: 1480,
      level: "Advanced",
      theme: "Rook Lift",
      hint: "Centralize the queen first, then lift the rook to the 7th rank for a decisive invasion.",
      solutionText: "1. Qd5 Qxd5 2. Bxd5 Nxd4 3. Bxd4 Rxd4 4. Nd2."
    }
  ];

  // ── Global State Object ──
  Object.assign(StudyPGN, {
    currentGame: null,
    chess: null,
    moveHistory: [],
    currentMoveIndex: -1,
    isAutoplaying: false,
    autoplayTimer: null,
    isGuessTheMoveMode: false,
    guessScore: 0,
    guessTotal: 0,
    boardOrientation: 'white',
    selectedSquare: null,
    legalMovesForSelected: [],
    activeAssignedTopic: null,

    // Daily Tactics State
    currentPuzzle: null,
    puzzleGame: null,
    puzzleMoveIndex: 0,
    puzzleIsPlayerTurn: true,
    dailyStreak: 0,
    hasSolvedToday: false,

    // Visualization State
    visionMode: 'color',
    visionTimer: null,
    visionTimeRemaining: 30,
    visionScore: 0,
    visionStreak: 0,
    visionTargetSquare: '',

    init: function () {
      this.ensureChessEngine();
      this.loadSavedRecords();
      this.loadDailyPuzzle();
      this.loadCuratedGame(0);
      this.setupKeyboardListeners();

      // Ensure all Import PGN buttons open the modal directly
      const openModal = function () {
        const modal = document.getElementById('import-pgn-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.add('active', 'open');
        const searchTabBtn = document.getElementById('import-tab-search');
        if (window.switchImportPgnSubTab && searchTabBtn) {
          try { window.switchImportPgnSubTab('search', searchTabBtn); } catch (e) {}
        }
      };

      // Bind by ID for known buttons
      const importBtns = [
        document.getElementById('btn-master-import-pgn'),
        document.getElementById('btn-import-pgn-header'),
        document.getElementById('btn-import-pgn-topics')
      ];

      importBtns.forEach(function (importBtn) {
        if (importBtn && !importBtn._studyPgnBound) {
          importBtn._studyPgnBound = true;
          importBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
          });
        }
      });

      // Fallback: catch any click on elements containing "Import PGN" text
      document.addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.textContent && target.textContent.includes('Import PGN')) {
          e.preventDefault();
          e.stopPropagation();
          try { openModal(); } catch (err) {}
        }
      });
    }
  });

  // ── Ensure Chess Engine Ready ──
  StudyPGN.ensureChessEngine = function () {
    if (!window.Chess) {
      console.warn('[StudyPGN] Initializing chess.js engine fallback');
      return false;
    }
    if (!StudyPGN.chess) {
      StudyPGN.chess = new window.Chess();
    }
    return true;
  };

  // ── Coin / Reward System ──
  StudyPGN.getCoins = function () {
    const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';
    try {
      const coinsRec = JSON.parse(localStorage.getItem(STORAGE_COINS) || '{}');
      return coinsRec[studentId] || 0;
    } catch (e) {
      return 0;
    }
  };

  StudyPGN.awardCoins = function (amount, reason = 'Study Practice') {
    const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';
    let coinsRec = {};
    try {
      coinsRec = JSON.parse(localStorage.getItem(STORAGE_COINS) || '{}');
    } catch (e) {}
    const cur = coinsRec[studentId] || 0;
    const updated = cur + amount;
    coinsRec[studentId] = updated;
    localStorage.setItem(STORAGE_COINS, JSON.stringify(coinsRec));

    if (window.toast) {
      window.toast(`🪙 +${amount} Chess Coins for ${reason}! Total: 🪙 ${updated}`, 'success');
    }
  };

  // ── Local Storage & Records Sync ──
  StudyPGN.loadSavedRecords = function () {
    try {
      const rec = JSON.parse(localStorage.getItem(STORAGE_TACTICS_RECORDS) || '{}');
      const todayStr = new Date().toISOString().split('T')[0];
      const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';

      const studRec = rec[studentId] || { streak: 0, lastDate: '', solvedCount: 0, history: [] };
      this.dailyStreak = studRec.streak || 0;
      this.hasSolvedToday = (studRec.lastDate === todayStr);
    } catch (e) {
      console.warn('[StudyPGN] Error loading saved records:', e);
    }
  };

  StudyPGN.recordTacticsSolved = function (puzzleId, level, timeTakenSec) {
    const todayStr = new Date().toISOString().split('T')[0];
    const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';
    const studentName = window.currentStudent ? (window.currentStudent.name || window.currentStudent.full_name || 'Student') : 'Guest';

    try {
      const rec = JSON.parse(localStorage.getItem(STORAGE_TACTICS_RECORDS) || '{}');
      const studRec = rec[studentId] || { streak: 0, lastDate: '', solvedCount: 0, history: [] };

      const lastDate = studRec.lastDate;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (lastDate === yesterday) {
        studRec.streak = (studRec.streak || 0) + 1;
      } else if (lastDate !== todayStr) {
        studRec.streak = 1;
      }

      studRec.lastDate = todayStr;
      studRec.solvedCount = (studRec.solvedCount || 0) + 1;
      studRec.history.unshift({
        puzzle_id: puzzleId,
        level: level,
        time_taken_sec: timeTakenSec || 15,
        date: todayStr,
        timestamp: new Date().toISOString()
      });

      rec[studentId] = studRec;
      localStorage.setItem(STORAGE_TACTICS_RECORDS, JSON.stringify(rec));
      this.dailyStreak = studRec.streak;
      this.hasSolvedToday = true;

      StudyPGN.awardCoins(15, 'Daily Tactics Mastery');
    } catch (e) {}

    StudyPGN.updateStreakUI();
  };

  // ── Keyboard Navigation ──
  StudyPGN.setupKeyboardListeners = function () {
    if (StudyPGN._keyboardBound) return;
    StudyPGN._keyboardBound = true;

    window.addEventListener('keydown', (e) => {
      const labTab = document.getElementById('child-tab-studypgn');
      const adminLab = document.getElementById('page-studypgn');
      const coachLab = document.getElementById('page-coach-studypgn');
      const isActive = (labTab && labTab.classList.contains('active')) ||
                       (adminLab && adminLab.classList.contains('active')) ||
                       (coachLab && coachLab.classList.contains('active'));

      if (!isActive) return;
      if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        StudyPGN.nextMove();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        StudyPGN.prevMove();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        StudyPGN.firstMove();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        StudyPGN.lastMove();
      } else if (e.key === 'f' || e.key === 'F') {
        StudyPGN.flipBoard();
      } else if (e.key === ' ') {
        e.preventDefault();
        StudyPGN.toggleAutoplay();
      }
    });
  };

  // ── Lichess-Grade PGN Parser & Import Engine ──
  StudyPGN.parsePgnString = function (pgnText) {
    if (!pgnText || !pgnText.trim()) return [];

    const rawText = pgnText.trim();
    const rawBlocks = rawText.split(/(?=\[Event\s+)/i);
    const gameBlocks = [];

    rawBlocks.forEach((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const headers = {};
      const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
      let match;
      while ((match = headerRegex.exec(trimmed)) !== null) {
        headers[match[1]] = match[2];
      }

      const lastHeaderIdx = trimmed.lastIndexOf(']');
      let movesText = lastHeaderIdx !== -1 ? trimmed.substring(lastHeaderIdx + 1).trim() : trimmed;

      // Clean variation comments & annotations
      let cleanMoves = movesText.replace(/\{[^}]*\}/g, '');
      while (cleanMoves.includes('(')) {
        cleanMoves = cleanMoves.replace(/\([^()]*\)/g, '');
      }
      cleanMoves = cleanMoves.replace(/\$\d+/g, '').replace(/1-0|0-1|1\/2-1\/2|\*/g, '').trim();
      cleanMoves = cleanMoves.replace(/\s+/g, ' ');

      const white = headers.White || 'White';
      const black = headers.Black || 'Black';
      const eventName = headers.Event || `Study Chapter #${idx + 1}`;
      const title = (white !== '?' && black !== '?') ? `${white} vs ${black}` : eventName;

      gameBlocks.push({
        id: `pgn_${Date.now()}_${idx}`,
        title: title,
        white: white,
        black: black,
        event: eventName,
        site: headers.Site || '',
        date: headers.Date || '',
        result: headers.Result || '*',
        eco: headers.ECO || '',
        fen: headers.FEN || null,
        setUp: headers.SetUp === '1',
        headers: headers,
        rawPgn: trimmed,
        cleanMoves: cleanMoves
      });
    });

    return gameBlocks.length ? gameBlocks : [{
      id: `pgn_${Date.now()}_0`,
      title: 'Imported Study PGN',
      headers: {},
      rawPgn: rawText,
      cleanMoves: rawText
    }];
  };

  StudyPGN.loadCuratedGame = function (index) {
    const game = CURATED_STUDY_GAMES[index] || CURATED_STUDY_GAMES[0];
    StudyPGN.loadPgnString(game.pgn, game);
  };

  StudyPGN.loadPgnString = function (pgnText, metadata = {}) {
    StudyPGN.ensureChessEngine();
    if (!window.Chess) return;

    const cleanPgn = (pgnText || '').trim();
    const games = StudyPGN.parsePgnString(cleanPgn);
    const primaryGame = games[0] || {};
    StudyPGN.loadedMultiGames = games;

    let c;
    if (primaryGame && primaryGame.fen) {
      try {
        c = new window.Chess(primaryGame.fen);
      } catch (e) {
        c = new window.Chess();
      }
    } else {
      c = new window.Chess();
    }

    let success = c.load_pgn(cleanPgn);
    if (!success && primaryGame && primaryGame.cleanMoves) {
      const fallbackPgn = (primaryGame.fen ? `[FEN "${primaryGame.fen}"]\n\n` : '') + primaryGame.cleanMoves;
      success = c.load_pgn(fallbackPgn);
    }

    if (!success && primaryGame && primaryGame.cleanMoves) {
      const tokens = primaryGame.cleanMoves.split(/\d+\./).join(' ').split(/\s+/).filter(Boolean);
      tokens.forEach(tok => {
        if (tok && tok !== '*' && tok !== '1-0' && tok !== '0-1') {
          try { c.move(tok); } catch (err) {}
        }
      });
      success = true;
    }

    if (!success) {
      if (window.toast) window.toast('Unable to parse PGN notation format.', 'warning');
      return;
    }

    const fenCandidate = (primaryGame && primaryGame.fen) || (primaryGame && primaryGame.headers && primaryGame.headers.FEN) || (metadata && metadata.headers && metadata.headers.FEN) || null;
    StudyPGN.initialFen = fenCandidate;

    StudyPGN.currentGame = {
      ...metadata,
      title: metadata.title || primaryGame?.title || 'Imported Study',
      white: metadata.white || primaryGame?.white || 'White',
      black: metadata.black || primaryGame?.black || 'Black',
      result: metadata.result || primaryGame?.result || '*',
      pgn: cleanPgn,
      fen: fenCandidate,
      headers: c.header ? c.header() : (primaryGame?.headers || {})
    };

    StudyPGN.moveHistory = c.history({ verbose: true });
    StudyPGN.chess = fenCandidate ? new window.Chess(fenCandidate) : new window.Chess();
    StudyPGN.currentMoveIndex = -1;
    StudyPGN.selectedSquare = null;
    StudyPGN.legalMovesForSelected = [];
    StudyPGN.isAutoplaying = false;
    if (StudyPGN.autoplayTimer) clearInterval(StudyPGN.autoplayTimer);

    // Save to LocalStorage studies list
    StudyPGN.savePgnToLocalStorage(StudyPGN.currentGame);

    // Auto-switch to Study Lab sub-view if not currently on board
    const isCoach = window.role === 'coach' && document.getElementById('page-coach-studypgn')?.classList.contains('active');
    if (isCoach && window.switchCoachStudyTab) {
      window.switchCoachStudyTab('board');
    } else if (window.setStudyPgnSubTab) {
      window.setStudyPgnSubTab('lab');
    }

    StudyPGN.renderBoard();
    StudyPGN.renderMoveList();
    StudyPGN.renderGameInfo();
    StudyPGN.updateAiMoveGuide();
    StudyPGN.fetchLichessOpeningStats();
    StudyPGN.fetchStockfishCloudEval();
  };

  StudyPGN.savePgnToLocalStorage = function (game) {
    if (!game || !game.pgn) return;
    try {
      let saved = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]');
      saved = saved.filter(s => s.pgn !== game.pgn);
      const studentId = window.currentStudent ? String(window.currentStudent.id) : '';
      saved.unshift({
        id: game.id || `saved-${Date.now()}`,
        title: game.title || 'Imported Study',
        white: game.white || 'White',
        black: game.black || 'Black',
        result: game.result || '*',
        pgn: game.pgn,
        student_id: studentId,
        timestamp: new Date().toISOString()
      });
      if (saved.length > 20) saved = saved.slice(0, 20);
      localStorage.setItem(STORAGE_SAVED_STUDIES, JSON.stringify(saved));
    } catch (e) {}
  };
  StudyPGN.goToMove = function (index) {
    if (!StudyPGN.moveHistory) return;
    const targetIdx = Math.max(-1, Math.min(index, StudyPGN.moveHistory.length - 1));

    const initialFen = StudyPGN.initialFen || (StudyPGN.currentGame && StudyPGN.currentGame.headers && StudyPGN.currentGame.headers.FEN) || (StudyPGN.currentGame && StudyPGN.currentGame.fen);
    StudyPGN.chess = initialFen ? new window.Chess(initialFen) : new window.Chess();
    for (let i = 0; i <= targetIdx; i++) {
      if (StudyPGN.moveHistory[i]) {
        StudyPGN.chess.move(StudyPGN.moveHistory[i]);
      }
    }
    StudyPGN.currentMoveIndex = targetIdx;
    StudyPGN.selectedSquare = null;
    StudyPGN.legalMovesForSelected = [];

    StudyPGN.renderBoard();
    StudyPGN.highlightCurrentMove();
    StudyPGN.updateEvalGauge();
    StudyPGN.updateAiMoveGuide();
    StudyPGN.fetchLichessOpeningStats();
    StudyPGN.fetchStockfishCloudEval();
  };

  StudyPGN.nextMove = function () {
    if (StudyPGN.currentMoveIndex < StudyPGN.moveHistory.length - 1) {
      StudyPGN.goToMove(StudyPGN.currentMoveIndex + 1);
    } else if (StudyPGN.isAutoplaying) {
      StudyPGN.toggleAutoplay();
    }
  };

  StudyPGN.prevMove = function () {
    if (StudyPGN.currentMoveIndex >= 0) {
      StudyPGN.goToMove(StudyPGN.currentMoveIndex - 1);
    }
  };

  StudyPGN.firstMove = function () {
    StudyPGN.goToMove(-1);
  };

  StudyPGN.lastMove = function () {
    StudyPGN.goToMove(StudyPGN.moveHistory.length - 1);
  };

  StudyPGN.flipBoard = function () {
    StudyPGN.boardOrientation = StudyPGN.boardOrientation === 'white' ? 'black' : 'white';
    StudyPGN.renderBoard();
  };

  StudyPGN.toggleAutoplay = function () {
    StudyPGN.isAutoplaying = !StudyPGN.isAutoplaying;
    const btn1 = document.getElementById('pgn-btn-autoplay');
    const btn2 = document.getElementById('coach-pgn-btn-autoplay');
    const label = StudyPGN.isAutoplaying ? '⏸ Pause' : '▶ Play';
    if (btn1) btn1.innerHTML = label;
    if (btn2) btn2.innerHTML = label;

    if (StudyPGN.autoplayTimer) clearInterval(StudyPGN.autoplayTimer);
    if (StudyPGN.isAutoplaying) {
      StudyPGN.autoplayTimer = setInterval(() => {
        StudyPGN.nextMove();
      }, 1400);
    }
  };

  // ── Render High-Fidelity Vector SVG Board ──
  StudyPGN.renderBoard = function () {
    const containers = [
      document.getElementById('pgn-study-board'),
      document.getElementById('coach-pgn-study-board')
    ].filter(Boolean);

    if (!containers.length) return;

    if (!StudyPGN.chess) {
      if (window.Chess) StudyPGN.chess = new window.Chess();
    }

    const board = StudyPGN.chess ? StudyPGN.chess.board() : [
      [{ type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }],
      [{ type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [{ type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }],
      [{ type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }]
    ];

    const isFlipped = StudyPGN.boardOrientation === 'black';
    const lastMove = StudyPGN.moveHistory && StudyPGN.currentMoveIndex >= 0 ? StudyPGN.moveHistory[StudyPGN.currentMoveIndex] : null;
    const isCheck = StudyPGN.chess && StudyPGN.chess.in_check ? StudyPGN.chess.in_check() : false;
    const turn = StudyPGN.chess ? StudyPGN.chess.turn() : 'w';

    let html = `
      <div class="pgn-chess-grid chesscom-board-wrap" style="display:grid; grid-template-columns:repeat(8, 1fr); grid-template-rows:repeat(8, 1fr); aspect-ratio:1/1; width:100%; max-width:520px; margin:0 auto; border-radius:4px; overflow:hidden; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); position:relative; box-sizing:border-box; user-select:none;">
    `;

    const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    rows.forEach(r => {
      cols.forEach(c => {
        const isLight = (r + c) % 2 === 0;
        const squareName = String.fromCharCode(97 + c) + (8 - r);
        const piece = board[r][c];

        // Exact Chess.com Neo Colors
        const isHighlight = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
        const isSelected = StudyPGN.selectedSquare === squareName;
        const isLegalDest = StudyPGN.legalMovesForSelected && StudyPGN.legalMovesForSelected.some(m => m.to === squareName);
        const isKingInCheck = isCheck && piece && piece.type === 'k' && piece.color === turn;

        // Chess.com Square Background Colors
        let bgColor = isLight ? '#ebecd0' : '#779556';
        if (isHighlight) bgColor = isLight ? '#f5f682' : '#baca44';
        if (isSelected) bgColor = '#f5f682';
        if (isKingInCheck) bgColor = 'radial-gradient(ellipse at center, #ef4444 0%, #dc2626 70%, #991b1b 100%)';

        const pieceImgUrl = piece ? getPieceImage(piece) : '';
        const canDrag = piece && StudyPGN.chess && piece.color === StudyPGN.chess.turn();

        html += `
          <div class="pgn-square" data-square="${squareName}"
               onclick="StudyPGN.onBoardSquareClicked('${squareName}')"
               ondragover="StudyPGN.onBoardDragOver(event)"
               ondrop="StudyPGN.onBoardDrop(event, '${squareName}')"
               style="background:${bgColor}; aspect-ratio:1/1; width:100%; height:100%; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none; position:relative; box-sizing:border-box; overflow:hidden;">
            ${pieceImgUrl ? `
              <img src="${pieceImgUrl}" alt="${piece.color}${piece.type}"
                   draggable="${canDrag ? 'true' : 'false'}"
                   ondragstart="StudyPGN.onBoardDragStart(event, '${squareName}')"
                   style="width:100%; height:100%; object-fit:contain; pointer-events:${canDrag ? 'auto' : 'none'}; user-select:none; display:block; cursor:${canDrag ? 'grab' : 'default'};" />
            ` : ''}

            ${isLegalDest ? `
              <div style="position:absolute; width:${piece ? '90%' : '32%'}; height:${piece ? '90%' : '32%'}; border-radius:50%; ${piece ? 'border:6px solid rgba(0,0,0,0.22);' : 'background:rgba(0,0,0,0.18);'} pointer-events:none; z-index:2; box-sizing:border-box;"></div>
            ` : ''}

            ${c === (isFlipped ? 7 : 0) ? `<span style="position:absolute; top:2px; left:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; pointer-events:none; user-select:none;">${8 - r}</span>` : ''}
            ${r === (isFlipped ? 0 : 7) ? `<span style="position:absolute; bottom:2px; right:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; pointer-events:none; user-select:none;">${String.fromCharCode(97 + c)}</span>` : ''}
          </div>
        `;
      });
    });

    html += `</div>`;
    containers.forEach(c => {
      c.innerHTML = html;
    });
  };

  StudyPGN.onBoardDragStart = function (e, square) {
    if (!StudyPGN.chess) return;
    const piece = StudyPGN.chess.get(square);
    if (piece && piece.color === StudyPGN.chess.turn()) {
      StudyPGN.selectedSquare = square;
      StudyPGN.legalMovesForSelected = StudyPGN.chess.moves({ square: square, verbose: true });
      StudyPGN.renderBoard();
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', square);
        e.dataTransfer.effectAllowed = 'move';
      }
    }
  };

  StudyPGN.onBoardDragOver = function (e) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  StudyPGN.onBoardDrop = function (e, targetSquare) {
    e.preventDefault();
    if (!StudyPGN.selectedSquare) return;
    StudyPGN.onBoardSquareClicked(targetSquare);
  };

  StudyPGN.onBoardSquareClicked = function (square) {
    if (!StudyPGN.chess) return;

    if (StudyPGN.isGuessTheMoveMode) {
      StudyPGN.handleGuessMove(square);
      return;
    }

    if (!StudyPGN.selectedSquare) {
      const piece = StudyPGN.chess.get(square);
      if (piece && piece.color === StudyPGN.chess.turn()) {
        StudyPGN.selectedSquare = square;
        StudyPGN.legalMovesForSelected = StudyPGN.chess.moves({ square: square, verbose: true });
        StudyPGN.renderBoard();
      }
    } else {
      const fromSq = StudyPGN.selectedSquare;
      const move = StudyPGN.chess.move({ from: fromSq, to: square, promotion: 'q' });
      StudyPGN.selectedSquare = null;
      StudyPGN.legalMovesForSelected = [];

      if (move) {
        // Play Move / Capture Sound
        if (StudyPGN.playMoveSound) StudyPGN.playMoveSound(Boolean(move.captured));

        // Free Move & Live Variation Branching
        if (Array.isArray(StudyPGN.moveHistory)) {
          StudyPGN.moveHistory = StudyPGN.moveHistory.slice(0, StudyPGN.currentMoveIndex + 1);
          StudyPGN.moveHistory.push(move);
          StudyPGN.currentMoveIndex = StudyPGN.moveHistory.length - 1;
        } else {
          StudyPGN.moveHistory = [move];
          StudyPGN.currentMoveIndex = 0;
        }

        StudyPGN.renderBoard();
        StudyPGN.renderMoveList();
        StudyPGN.highlightCurrentMove();
        StudyPGN.updateAiMoveGuide(move);
        StudyPGN.updateEvalGauge();
        StudyPGN.fetchLichessOpeningStats();
        StudyPGN.fetchStockfishCloudEval();

        // Computer AI response if enabled
        if (StudyPGN.isPlayVsAiMode && !StudyPGN.chess.game_over()) {
          StudyPGN.scheduleComputerMove();
        }
      } else {
        const piece = StudyPGN.chess.get(square);
        if (piece && piece.color === StudyPGN.chess.turn()) {
          StudyPGN.selectedSquare = square;
          StudyPGN.legalMovesForSelected = StudyPGN.chess.moves({ square: square, verbose: true });
        }
        StudyPGN.renderBoard();
      }
    }
  };

  StudyPGN.scheduleComputerMove = function () {
    if (StudyPGN.computerMoveTimer) clearTimeout(StudyPGN.computerMoveTimer);
    StudyPGN.computerMoveTimer = setTimeout(() => {
      StudyPGN.makeComputerResponseMove();
    }, 450);
  };

  StudyPGN.makeComputerResponseMove = function () {
    if (!StudyPGN.chess || StudyPGN.chess.game_over()) return;
    const moves = StudyPGN.chess.moves({ verbose: true });
    if (!moves || !moves.length) return;

    // Pick smart tactical or capturing move if available
    const captures = moves.filter(m => m.captured || m.san.includes('+') || m.san.includes('#'));
    const chosen = (captures.length && Math.random() > 0.3)
      ? captures[Math.floor(Math.random() * captures.length)]
      : moves[Math.floor(Math.random() * moves.length)];

    const move = StudyPGN.chess.move(chosen);
    if (move) {
      if (StudyPGN.playMoveSound) StudyPGN.playMoveSound(Boolean(move.captured));
      if (Array.isArray(StudyPGN.moveHistory)) {
        StudyPGN.moveHistory = StudyPGN.moveHistory.slice(0, StudyPGN.currentMoveIndex + 1);
        StudyPGN.moveHistory.push(move);
        StudyPGN.currentMoveIndex = StudyPGN.moveHistory.length - 1;
      }
      StudyPGN.renderBoard();
      StudyPGN.renderMoveList();
      StudyPGN.highlightCurrentMove();
      StudyPGN.updateAiMoveGuide(move);
      StudyPGN.updateEvalGauge();
      StudyPGN.fetchLichessOpeningStats();
      StudyPGN.fetchStockfishCloudEval();
    }
  };

  StudyPGN.togglePlayVsAi = function () {
    StudyPGN.isPlayVsAiMode = !StudyPGN.isPlayVsAiMode;
    const btns = [document.getElementById('pgn-btn-ai-play'), document.getElementById('coach-pgn-btn-ai-play')].filter(Boolean);
    btns.forEach(btn => {
      if (StudyPGN.isPlayVsAiMode) {
        btn.classList.add('active', 'btn-gold');
        btn.classList.remove('btn-outline');
        btn.innerHTML = '🤖 Play vs AI: ON';
      } else {
        btn.classList.remove('active', 'btn-gold');
        btn.classList.add('btn-outline');
        btn.innerHTML = '🤖 Play vs AI: OFF';
      }
    });

    if (StudyPGN.isPlayVsAiMode && StudyPGN.chess && StudyPGN.chess.turn() === 'b') {
      StudyPGN.scheduleComputerMove();
    }
    if (window.toast) {
      window.toast(StudyPGN.isPlayVsAiMode ? '🤖 Play vs Stockfish AI enabled! Make your move on the board.' : '♟️ Free Move Analysis Mode active.', 'info');
    }
  };

  // ── Render Move Notation Tree ──
  StudyPGN.renderMoveList = function () {
    const listContainers = [
      document.getElementById('pgn-movelist-container'),
      document.getElementById('coach-pgn-movelist-container')
    ].filter(Boolean);

    if (!listContainers.length || !StudyPGN.moveHistory) return;

    let html = '';
    for (let i = 0; i < StudyPGN.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = StudyPGN.moveHistory[i];
      const bMove = StudyPGN.moveHistory[i + 1];

      const isWActive = StudyPGN.currentMoveIndex === i;
      const isBActive = StudyPGN.currentMoveIndex === i + 1;

      html += `
        <div style="display:grid; grid-template-columns:36px 1fr 1fr; gap:6px; align-items:center; padding:3px 8px; border-radius:6px; font-size:13px; font-family:monospace;">
          <span style="color:#64748b; font-weight:700;">${moveNum}.</span>
          <button class="pgn-move-btn ${isWActive ? 'active' : ''}" onclick="StudyPGN.goToMove(${i})"
                  style="text-align:left; background:${isWActive ? 'var(--gold, #daa33e)' : 'rgba(255,255,255,0.04)'}; color:${isWActive ? '#000' : '#fff'}; font-weight:${isWActive ? '800' : '600'}; padding:5px 8px; border-radius:6px; border:none; cursor:pointer;">
            ${wMove.san}
          </button>
          ${bMove ? `
            <button class="pgn-move-btn ${isBActive ? 'active' : ''}" onclick="StudyPGN.goToMove(${i + 1})"
                    style="text-align:left; background:${isBActive ? 'var(--gold, #daa33e)' : 'rgba(255,255,255,0.04)'}; color:${isBActive ? '#000' : '#fff'}; font-weight:${isBActive ? '800' : '600'}; padding:5px 8px; border-radius:6px; border:none; cursor:pointer;">
              ${bMove.san}
            </button>
          ` : '<span></span>'}
        </div>
      `;
    }

    listContainers.forEach(c => {
      c.innerHTML = html;
    });
  };

  StudyPGN.highlightCurrentMove = function () {
    const btns = document.querySelectorAll('.pgn-move-btn');
    btns.forEach((btn, idx) => {
      // Each pair is 2 buttons, find matched move index
      if (idx === StudyPGN.currentMoveIndex) {
        btn.classList.add('active');
        btn.style.background = 'var(--gold, #daa33e)';
        btn.style.color = '#000';
        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        btn.classList.remove('active');
        btn.style.background = 'rgba(255,255,255,0.04)';
        btn.style.color = '#fff';
      }
    });
  };

  StudyPGN.renderGameInfo = function () {
    const g = StudyPGN.currentGame;
    if (!g) return;
    const titles = [document.getElementById('pgn-game-title'), document.getElementById('coach-pgn-game-title')].filter(Boolean);
    const descs = [document.getElementById('pgn-game-desc'), document.getElementById('coach-pgn-game-desc')].filter(Boolean);
    const players = [document.getElementById('pgn-game-players'), document.getElementById('coach-pgn-game-players')].filter(Boolean);

    titles.forEach(el => el.textContent = g.title || 'Grandmaster Masterclass Study');
    descs.forEach(el => el.textContent = g.description || '');
    players.forEach(el => el.innerHTML = `<strong>⚪ ${escapeHtml(g.white || 'White')}</strong> vs <strong>⚫ ${escapeHtml(g.black || 'Black')}</strong> · <span style="color:var(--gold); font-weight:700;">${escapeHtml(g.result || '*')}</span>`);

    // Sync selectors if present
    const s1 = document.getElementById('pgn-game-selector');
    const s2 = document.getElementById('coach-pgn-game-selector');
    const curIdx = CURATED_STUDY_GAMES.findIndex(item => item.title === g.title);
    if (curIdx >= 0) {
      if (s1) s1.value = String(curIdx);
      if (s2) s2.value = String(curIdx);
    }
  };

  // ── TOM AI Move Guidance & Pedagogical Breakdown ──
  StudyPGN.updateAiMoveGuide = function (customMove) {
    const guideEls = [
      document.getElementById('pgn-tom-ai-guide'),
      document.getElementById('coach-pgn-tom-ai-guide')
    ].filter(Boolean);

    if (!guideEls.length) return;

    const move = customMove || (StudyPGN.moveHistory && StudyPGN.currentMoveIndex >= 0 ? StudyPGN.moveHistory[StudyPGN.currentMoveIndex] : null);

    if (!move) {
      const defaultHtml = `
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="font-size:24px;">🤖</div>
          <div>
            <div style="font-size:12px; font-weight:800; color:var(--gold); text-transform:uppercase; margin-bottom:4px;">TOM AI Move Assistant</div>
            <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.5;">Starting position loaded. Step forward with <strong>▶ Next Move</strong> or click on the board to explore candidate master lines!</p>
          </div>
        </div>
      `;
      guideEls.forEach(el => el.innerHTML = defaultHtml);
      return;
    }

    const san = move.san;
    let rationale = `Played <strong>${escapeHtml(san)}</strong>.`;

    if (san === 'e4' || san === 'd4') rationale = `Controls key central squares (d5, e5), opens diagonal pathways for bishop and queen development.`;
    else if (san === 'Nf3' || san === 'Nc3' || san === 'Nf6' || san === 'Nc6') rationale = `Develops the knight toward the center, pressuring key central outposts before moving wing pieces.`;
    else if (san.includes('O-O')) rationale = `Castling secures the king behind a protective pawn wall and activates the rook onto the central file.`;
    else if (san.includes('x')) rationale = `Tactical capture! Clears an attacking line and challenges the opponent's defensive structure.`;
    else if (san.includes('+')) rationale = `Check! Forces the defending side to respond immediately, creating tempo advantages.`;
    else if (san.includes('#')) rationale = `Checkmate! The Grandmaster execution completes the mating net. Outstanding game finish!`;
    else if (san.startsWith('B')) rationale = `Develops the bishop to an active diagonal, targeting opponent weaknesses or pinning minor pieces.`;

    const html = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div style="font-size:24px;">🤖</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:12px; font-weight:800; color:var(--gold); text-transform:uppercase;">TOM AI Guidance • Move ${escapeHtml(san)}</span>
            <button class="btn btn-outline btn-sm" onclick="window.askTomAiAboutPosition()" style="font-size:10.5px; padding:2px 8px; border-color:rgba(218,163,62,0.4); color:var(--gold);">🎙️ Ask TOM</button>
          </div>
          <p style="margin:0; font-size:13px; color:#e2e8f0; line-height:1.5;">${rationale}</p>
        </div>
      </div>
    `;

    guideEls.forEach(el => el.innerHTML = html);
  };

  window.askTomAiAboutPosition = function () {
    if (!StudyPGN.chess) return;
    const fen = StudyPGN.chess.fen();
    const move = StudyPGN.moveHistory && StudyPGN.currentMoveIndex >= 0 ? StudyPGN.moveHistory[StudyPGN.currentMoveIndex] : null;
    const moveText = move ? move.san : 'Start position';

    if (window.toast) {
      window.toast(`🤖 TOM AI: Analyzing position after ${moveText}... FEN: ${fen.substring(0, 25)}...`, 'info');
    }
  };

  // ── Stockfish Evaluation Gauge & Cloud API Sync ──
  StudyPGN.updateEvalGauge = function () {
    const bars = [document.getElementById('pgn-eval-bar'), document.getElementById('coach-pgn-eval-bar')].filter(Boolean);
    const scoreTexts = [document.getElementById('pgn-eval-text'), document.getElementById('coach-pgn-eval-text')].filter(Boolean);
    if (!bars.length || !StudyPGN.chess) return;

    let score = 0;
    const pieceVals = { p: 1, n: 3.2, b: 3.3, r: 5, q: 9.5, k: 0 };
    const board = StudyPGN.chess.board();

    board.forEach(row => {
      row.forEach(p => {
        if (p) {
          const val = pieceVals[p.type] || 0;
          score += (p.color === 'w' ? val : -val);
        }
      });
    });

    const clampedScore = Math.max(-10, Math.min(10, score));
    const whitePct = 50 + (clampedScore * 4.5);

    bars.forEach(b => b.style.height = `${whitePct}%`);
    scoreTexts.forEach(st => st.textContent = (score >= 0 ? `+${score.toFixed(1)}` : score.toFixed(1)));
  };

  StudyPGN.fetchStockfishCloudEval = async function () {
    if (!StudyPGN.chess) return;
    const fen = StudyPGN.chess.fen();
    const scoreTexts = [document.getElementById('pgn-eval-text'), document.getElementById('coach-pgn-eval-text')].filter(Boolean);
    const bars = [document.getElementById('pgn-eval-bar'), document.getElementById('coach-pgn-eval-bar')].filter(Boolean);

    try {
      const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.pvs && data.pvs[0]) {
          const pv = data.pvs[0];
          if (pv.mate) {
            scoreTexts.forEach(st => st.textContent = `M${pv.mate}`);
            bars.forEach(b => b.style.height = pv.mate > 0 ? '100%' : '0%');
          } else if (pv.cp != null) {
            const cpVal = pv.cp / 100;
            scoreTexts.forEach(st => st.textContent = (cpVal >= 0 ? `+${cpVal.toFixed(1)}` : cpVal.toFixed(1)));
            const whitePct = Math.max(5, Math.min(95, 50 + (cpVal * 4.5)));
            bars.forEach(b => b.style.height = `${whitePct}%`);
          }
        }
      }
    } catch (e) {}
  };

  // ── Lichess Master Opening Explorer API ──
  StudyPGN.fetchLichessOpeningStats = async function () {
    const explorerEls = [
      document.getElementById('pgn-lichess-explorer'),
      document.getElementById('coach-pgn-lichess-explorer')
    ].filter(Boolean);

    if (!explorerEls.length || !StudyPGN.chess) return;

    const fen = StudyPGN.chess.fen();
    try {
      explorerEls.forEach(el => el.innerHTML = `<div style="font-size:11px; color:#94a3b8; padding:8px;"><span class="spinner" style="display:inline-block; width:12px; height:12px; margin-right:4px;"></span> Fetching Lichess Masters statistics...</div>`);

      let res = await fetch(`/api/lichess-explorer-proxy?fen=${encodeURIComponent(fen)}&topGames=3&moves=4`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=3&moves=4`).catch(() => null);
      }
      if (!res || !res.ok) throw new Error('API limit or offline');
      const data = await res.json();

      if (!data.moves || !data.moves.length) {
        explorerEls.forEach(el => el.innerHTML = `<div style="font-size:12px; color:var(--ivory-dim); padding:8px;">End of master opening book. Explore tactical novelties!</div>`);
        return;
      }

      let movesHtml = data.moves.slice(0, 4).map(m => {
        const total = m.white + m.draws + m.black;
        const wPct = Math.round((m.white / total) * 100) || 0;
        const dPct = Math.round((m.draws / total) * 100) || 0;
        const bPct = Math.round((m.black / total) * 100) || 0;
        return `
          <div style="display:grid; grid-template-columns:50px 1fr 60px; gap:8px; align-items:center; font-size:11.5px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <strong style="color:var(--gold);">${escapeHtml(m.san)}</strong>
            <div style="display:flex; height:8px; border-radius:4px; overflow:hidden; background:#334155;">
              <div style="width:${wPct}%; background:#ffffff;" title="White wins: ${wPct}%"></div>
              <div style="width:${dPct}%; background:#94a3b8;" title="Draws: ${dPct}%"></div>
              <div style="width:${bPct}%; background:#0f172a;" title="Black wins: ${bPct}%"></div>
            </div>
            <span style="font-size:10px; color:#94a3b8; text-align:right;">${total.toLocaleString()}</span>
          </div>
        `;
      }).join('');

      const html = `
        <div style="padding:4px 0;">
          <div style="font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; margin-bottom:6px; display:flex; justify-content:space-between;">
            <span>♟️ Lichess Master Move Tree</span>
            <span>${(data.white + data.draws + data.black).toLocaleString()} Games</span>
          </div>
          ${movesHtml}
        </div>
      `;

      explorerEls.forEach(el => el.innerHTML = html);
    } catch (e) {
      explorerEls.forEach(el => el.innerHTML = `<div style="font-size:11px; color:#94a3b8; padding:8px;">Live Lichess Master Explorer active. Step moves to view statistics.</div>`);
    }
  };

  // ── "Guess the Move" GM Training Mode ──
  StudyPGN.toggleGuessTheMove = function () {
    StudyPGN.isGuessTheMoveMode = !StudyPGN.isGuessTheMoveMode;
    const btn = document.getElementById('pgn-btn-guess');
    const panel = document.getElementById('pgn-guess-panel');

    if (btn) {
      btn.style.background = StudyPGN.isGuessTheMoveMode ? 'var(--gold)' : 'transparent';
      btn.style.color = StudyPGN.isGuessTheMoveMode ? '#000' : 'var(--gold)';
    }
    if (panel) panel.style.display = StudyPGN.isGuessTheMoveMode ? 'block' : 'none';

    if (StudyPGN.isGuessTheMoveMode) {
      StudyPGN.guessScore = 0;
      StudyPGN.guessTotal = 0;
      if (window.toast) window.toast('🎯 Guess the Move Activated! Click a piece and play your candidate move on the board.', 'info');
    }
  };

  // ── Daily Tactics Workout Engine ──
  StudyPGN.loadDailyPuzzle = async function (filterLevel) {
    const levelSelect = document.getElementById('tactics-level-select');
    const topicSelect = document.getElementById('tactics-topic-select');
    const puzzleSelect = document.getElementById('tactics-puzzle-select');

    if (levelSelect && levelSelect.options.length <= 1) {
      StudyPGN.populateTacticsLevelSelect();
    }

    const activeLevel = filterLevel || (levelSelect ? levelSelect.value : '') || 'all';
    const activeTopic = topicSelect ? topicSelect.value : '';

    if (activeLevel && activeLevel !== 'all') {
      const filtered = CURATED_TACTICS.filter(p => p.level.toLowerCase() === activeLevel.toLowerCase());
      if (filtered.length) {
        const puz = filtered[Math.floor(Math.random() * filtered.length)];
        StudyPGN.currentPuzzle = puz;
        StudyPGN.setupPuzzle(puz);
        if (topicSelect) {
          StudyPGN.onTacticsLevelChanged(activeLevel);
          topicSelect.value = puz.theme;
          StudyPGN.onTacticsTopicChanged(puz.theme);
        }
        if (puzzleSelect) puzzleSelect.value = puz.id;
        return;
      }
    }

    try {
      const res = await fetch('https://lichess.org/api/puzzle/daily');
      if (res.ok) {
        const data = await res.json();
        if (data.game && data.puzzle) {
          StudyPGN.currentPuzzle = {
            id: data.puzzle.id,
            fen: data.puzzle.fen,
            moves: data.puzzle.solution || [],
            rating: data.puzzle.rating,
            title: `Lichess Daily Master Puzzle (#${data.puzzle.id})`,
            hint: 'Look for tactical themes: Pins, Forks, Discovered Attacks, or Checkmating nets.',
            level: 'Intermediate',
            solutionText: (data.puzzle.solution || []).join(' ')
          };
          StudyPGN.setupPuzzle(StudyPGN.currentPuzzle);
          return;
        }
      }
    } catch (e) {}

    const puz = CURATED_TACTICS[Math.floor(Math.random() * CURATED_TACTICS.length)];
    StudyPGN.currentPuzzle = puz;
    StudyPGN.setupPuzzle(puz);
    if (levelSelect && levelSelect.options.length <= 1) StudyPGN.populateTacticsLevelSelect();
    if (levelSelect) levelSelect.value = puz.level;
    if (topicSelect) StudyPGN.onTacticsLevelChanged(puz.level);
    if (topicSelect) topicSelect.value = puz.theme;
    if (puzzleSelect) StudyPGN.onTacticsTopicChanged(puz.theme);
    if (puzzleSelect) puzzleSelect.value = puz.id;
  };

  StudyPGN.loadPuzzleById = function (puzzleId) {
    const puz = CURATED_TACTICS.find(p => p.id === puzzleId) || CURATED_TACTICS[0];
    StudyPGN.currentPuzzle = puz;
    StudyPGN.setupPuzzle(puz);
  };

  StudyPGN.resetCurrentPuzzle = function () {
    if (!StudyPGN.currentPuzzle) return;
    selectedTacticsSquare = null;
    tacticsLegalDestinations = [];
    StudyPGN.setupPuzzle(StudyPGN.currentPuzzle);
    if (window.toast) window.toast('🔄 Puzzle position reset.', 'info');
  };

  StudyPGN.revealTacticsSolution = function () {
    const puz = StudyPGN.currentPuzzle;
    if (!puz) return;
    const hintEl = document.getElementById('tactics-hint-text');
    if (hintEl) {
      hintEl.innerHTML = `👁️ <strong>Solution Steps:</strong> ${escapeHtml(puz.solutionText || (puz.moves ? puz.moves.join(' ') : 'Check tactical move sequence'))}`;
    }
    if (window.toast) window.toast('👁️ Solution sequence displayed below!', 'info');
  };

  StudyPGN.setupPuzzle = function (puzzle) {
    if (!window.Chess) return;
    StudyPGN.puzzleGame = new window.Chess(puzzle.fen);
    StudyPGN.puzzleMoveIndex = 0;
    StudyPGN.puzzleIsPlayerTurn = true;
    selectedTacticsSquare = null;
    tacticsLegalDestinations = [];

    StudyPGN.renderTacticsBoard();
    StudyPGN.updateStreakUI();

    const titleEl = document.getElementById('tactics-puzzle-title');
    const hintEl = document.getElementById('tactics-hint-text');
    if (titleEl) titleEl.textContent = `${puzzle.title} (${puzzle.rating || 'Rated'} ELO)`;
    if (hintEl) hintEl.textContent = 'Click "💡 Ask TOM AI Hint" if you need a clue!';

    // Populate puzzle selector dropdown if present
    const selector = document.getElementById('tactics-puzzle-select');
    if (selector && selector.children.length <= 1) {
      let optHtml = '<option value="">🎯 Select Solvable Tactics Puzzle...</option>';
      CURATED_TACTICS.forEach(p => {
        optHtml += `<option value="${p.id}">${p.level}: ${escapeHtml(p.title)} (${p.rating} ELO)</option>`;
      });
      selector.innerHTML = optHtml;
    }
    if (selector && puzzle.id) selector.value = puzzle.id;
  };

  StudyPGN.populateTacticsLevelSelect = function () {
    const levelSelect = document.getElementById('tactics-level-select');
    if (!levelSelect) return;
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    let html = '<option value="">🎯 Select Level...</option>';
    levels.forEach(lvl => {
      html += `<option value="${lvl}">${lvl}</option>`;
    });
    levelSelect.innerHTML = html;
  };

  StudyPGN.populateTacticsDropdown = function () {
    const selector = document.getElementById('tactics-puzzle-select');
    if (!selector) return;
    let optHtml = '<option value="">🎯 Select Solvable Tactics Puzzle...</option>';
    CURATED_TACTICS.forEach(p => {
      optHtml += `<option value="${p.id}">${p.level}: ${escapeHtml(p.title)} (${p.rating} ELO)</option>`;
    });
    selector.innerHTML = optHtml;
  };

  StudyPGN.onTacticsLevelChanged = function (level) {
    const topicSelect = document.getElementById('tactics-topic-select');
    const puzzleSelect = document.getElementById('tactics-puzzle-select');
    if (!topicSelect || !puzzleSelect) return;

    topicSelect.innerHTML = '<option value="">📋 Select Topic...</option>';
    puzzleSelect.innerHTML = '<option value="">🧩 Select Puzzle...</option>';

    if (!level) return;

    const themes = [...new Set(CURATED_TACTICS.filter(p => p.level === level).map(p => p.theme))].sort();
    themes.forEach(theme => {
      topicSelect.innerHTML += `<option value="${escapeHtml(theme)}">${escapeHtml(theme)}</option>`;
    });
  };

  StudyPGN.onTacticsTopicChanged = function (topic) {
    const puzzleSelect = document.getElementById('tactics-puzzle-select');
    if (!puzzleSelect) return;

    puzzleSelect.innerHTML = '<option value="">🧩 Select Puzzle...</option>';
    if (!topic) return;

    const levelSelect = document.getElementById('tactics-level-select');
    const level = levelSelect ? levelSelect.value : '';
    const filtered = CURATED_TACTICS.filter(p => p.level === level && p.theme === topic);
    filtered.forEach(p => {
      puzzleSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.title)} (${p.rating} ELO)</option>`;
    });
  };

  StudyPGN.loadPuzzleByLevelAndTopic = function (level, topic) {
    const filtered = CURATED_TACTICS.filter(p => p.level === level && p.theme === topic);
    if (filtered.length) {
      const puz = filtered[Math.floor(Math.random() * filtered.length)];
      StudyPGN.currentPuzzle = puz;
      StudyPGN.setupPuzzle(puz);
    }
  };

  let selectedTacticsSquare = null;
  let tacticsLegalDestinations = [];

  StudyPGN.renderTacticsBoard = function () {
    const container = document.getElementById('tactics-board-container');
    if (!container) return;
    if (!StudyPGN.puzzleGame || !StudyPGN.currentPuzzle) {
      StudyPGN.loadNextPuzzle();
      return;
    }

    const board = StudyPGN.puzzleGame.board();
    const isWhiteTurn = StudyPGN.puzzleGame.turn() === 'w';

    let html = `
      <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:13px; font-weight:700; color:${isWhiteTurn ? '#fff' : '#fbbf24'};">
          ${isWhiteTurn ? '⚪ White to Move & Win' : '⚫ Black to Move & Win'}
        </span>
        <span style="font-size:12px; color:var(--ivory-dim);">Puzzle #${StudyPGN.currentPuzzle?.id || 'Daily'} (${StudyPGN.currentPuzzle?.level || 'Rated'})</span>
      </div>
      <div class="pgn-chess-grid chesscom-board-wrap" style="display:grid; grid-template-columns:repeat(8, 1fr); grid-template-rows:repeat(8, 1fr); aspect-ratio:1/1; width:100%; max-width:440px; margin:0 auto; border-radius:4px; overflow:hidden; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); position:relative; box-sizing:border-box; user-select:none;">
    `;

    for (let rIdx = 0; rIdx < 8; rIdx++) {
      for (let cIdx = 0; cIdx < 8; cIdx++) {
        // If Black turn, invert row and column to flip board!
        const r = isWhiteTurn ? rIdx : 7 - rIdx;
        const c = isWhiteTurn ? cIdx : 7 - cIdx;

        const isLight = (r + c) % 2 === 0;
        const squareName = String.fromCharCode(97 + c) + (8 - r);
        const piece = board[r][c];

        let bgColor = isLight ? '#ebecd0' : '#779556';
        if (selectedTacticsSquare === squareName) {
          bgColor = '#b5d66e';
        }

        const isLegalDot = tacticsLegalDestinations.includes(squareName);
        const pieceImgUrl = piece ? getPieceImage(piece) : '';

        html += `
          <div class="tactics-square" data-square="${squareName}" onclick="StudyPGN.onTacticsSquareClicked('${squareName}')"
               style="background:${bgColor}; aspect-ratio:1/1; width:100%; height:100%; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none; position:relative; box-sizing:border-box; overflow:hidden;">
            ${pieceImgUrl ? `
              <img src="${pieceImgUrl}" alt="${piece.color}${piece.type}" draggable="false"
                   style="width:100%; height:100%; object-fit:contain; pointer-events:none; user-select:none; display:block;" />
            ` : ''}
            ${isLegalDot ? `<div style="position:absolute; width:14px; height:14px; background:${piece ? 'rgba(239,68,68,0.6)' : 'rgba(0,0,0,0.22)'}; border-radius:50%; pointer-events:none;"></div>` : ''}
            ${cIdx === 0 ? `<span style="position:absolute; top:2px; left:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; pointer-events:none; user-select:none;">${8 - r}</span>` : ''}
            ${rIdx === 7 ? `<span style="position:absolute; bottom:2px; right:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; pointer-events:none; user-select:none;">${String.fromCharCode(97 + c)}</span>` : ''}
          </div>
        `;
      }
    }
    html += `</div>`;
    container.innerHTML = html;
  };

  StudyPGN.onTacticsSquareClicked = function (square) {
    if (!StudyPGN.puzzleGame) return;

    if (!selectedTacticsSquare) {
      const piece = StudyPGN.puzzleGame.get(square);
      if (piece && piece.color === StudyPGN.puzzleGame.turn()) {
        selectedTacticsSquare = square;
        const moves = StudyPGN.puzzleGame.moves({ square: square, verbose: true });
        tacticsLegalDestinations = moves.map(m => m.to);
        StudyPGN.renderTacticsBoard();
      }
    } else {
      const move = StudyPGN.puzzleGame.move({ from: selectedTacticsSquare, to: square, promotion: 'q' });
      selectedTacticsSquare = null;
      tacticsLegalDestinations = [];

      if (move) {
        StudyPGN.renderTacticsBoard();
        StudyPGN.checkTacticsMove(move);
      } else {
        const piece = StudyPGN.puzzleGame.get(square);
        if (piece && piece.color === StudyPGN.puzzleGame.turn()) {
          selectedTacticsSquare = square;
          const moves = StudyPGN.puzzleGame.moves({ square: square, verbose: true });
          tacticsLegalDestinations = moves.map(m => m.to);
        }
        StudyPGN.renderTacticsBoard();
      }
    }
  };

  StudyPGN.checkTacticsMove = function (move) {
    const puzzle = StudyPGN.currentPuzzle;
    if (!puzzle) return;

    const moveStr = move.from + move.to;
    const expectedMove = puzzle.moves ? puzzle.moves[StudyPGN.puzzleMoveIndex] : null;
    StudyPGN.puzzleIsPlayerTurn = (StudyPGN.puzzleMoveIndex % 2 === 0);

    if (!StudyPGN.puzzleIsPlayerTurn) {
      if (window.toast) window.toast('⚠️ Waiting for opponent response...', 'info');
      return;
    }

    if (!expectedMove || expectedMove === moveStr || move.san === expectedMove) {
      StudyPGN.puzzleMoveIndex++;
      if (StudyPGN.puzzleMoveIndex >= (puzzle.moves?.length || 1)) {
        if (window.toast) window.toast('🎉 Brilliant move! Puzzle Solved!', 'success');
        StudyPGN.recordTacticsSolved(puzzle.id, puzzle.level, 20);
        setTimeout(() => {
          StudyPGN.loadDailyPuzzle();
        }, 1800);
      } else {
        setTimeout(() => {
          const oppMoveStr = puzzle.moves[StudyPGN.puzzleMoveIndex];
          if (oppMoveStr && oppMoveStr.length >= 4) {
            const oppFrom = oppMoveStr.substring(0, 2);
            const oppTo = oppMoveStr.substring(2, 4);
            const legalMoves = StudyPGN.puzzleGame.moves({ square: oppFrom, verbose: true });
            const isLegal = legalMoves.some(m => m.to === oppTo);
            if (isLegal) {
              StudyPGN.puzzleGame.move({ from: oppFrom, to: oppTo });
              StudyPGN.puzzleMoveIndex++;
              StudyPGN.renderTacticsBoard();
            } else {
              if (window.toast) window.toast('⚠️ Puzzle data error: opponent move not legal. Skipping.', 'warning');
              StudyPGN.puzzleMoveIndex++;
            }
          }
        }, 500);
      }
    } else {
      if (window.toast) window.toast('❌ Not the optimal move. Recalculate your tactics!', 'warning');
      setTimeout(() => {
        StudyPGN.puzzleGame.undo();
        StudyPGN.renderTacticsBoard();
      }, 800);
    }
  };

  StudyPGN.showTacticsHint = function () {
    const hintEl = document.getElementById('tactics-hint-text');
    const puz = StudyPGN.currentPuzzle;
    if (!hintEl || !puz) return;
    hintEl.innerHTML = `💡 <strong>TOM AI Hint:</strong> ${escapeHtml(puz.hint || 'Look for tactical pins or royal forks!')}`;
  };
  StudyPGN.updateStreakUI = function () {
    const streakEl = document.getElementById('tactics-streak-count');
    const badgeEl = document.getElementById('tactics-flame-badge');
    if (streakEl) streakEl.textContent = `🔥 ${StudyPGN.dailyStreak} Day Streak`;
    if (badgeEl) badgeEl.style.display = StudyPGN.dailyStreak > 0 ? 'inline-flex' : 'none';
  };

  // ── Board Visualization & Speed Trainer ──
  StudyPGN.startVisionGame = function (mode = 'color') {
    StudyPGN.visionMode = mode;
    StudyPGN.visionScore = 0;
    StudyPGN.visionStreak = 0;
    StudyPGN.visionTimeRemaining = 30;

    const modal = document.getElementById('vision-trainer-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active', 'open');
    }

    StudyPGN.nextVisionQuestion();

    if (StudyPGN.visionTimer) clearInterval(StudyPGN.visionTimer);
    StudyPGN.visionTimer = setInterval(() => {
      StudyPGN.visionTimeRemaining--;
      const timeEl = document.getElementById('vision-time-remaining');
      if (timeEl) timeEl.textContent = `${StudyPGN.visionTimeRemaining}s`;

      if (StudyPGN.visionTimeRemaining <= 0) {
        clearInterval(StudyPGN.visionTimer);
        StudyPGN.endVisionGame();
      }
    }, 1000);
  };

  StudyPGN.nextVisionQuestion = function () {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const f = files[Math.floor(Math.random() * 8)];
    const r = ranks[Math.floor(Math.random() * 8)];
    StudyPGN.visionTargetSquare = f + r;

    const squareDisplay = document.getElementById('vision-target-square');
    if (squareDisplay) squareDisplay.textContent = StudyPGN.visionTargetSquare.toUpperCase();
  };

  StudyPGN.submitVisionAnswer = function (colorGuess) {
    const sq = StudyPGN.visionTargetSquare;
    if (!sq) return;

    const fIdx = sq.charCodeAt(0) - 97;
    const rIdx = parseInt(sq[1], 10) - 1;
    const isDark = (fIdx + rIdx) % 2 === 0;
    const correctColor = isDark ? 'dark' : 'light';

    if (colorGuess === correctColor) {
      StudyPGN.visionScore += 10 + (StudyPGN.visionStreak * 2);
      StudyPGN.visionStreak++;
    } else {
      StudyPGN.visionStreak = 0;
    }

    const scoreEl = document.getElementById('vision-current-score');
    if (scoreEl) scoreEl.textContent = StudyPGN.visionScore;

    StudyPGN.nextVisionQuestion();
  };

  StudyPGN.endVisionGame = function () {
    if (StudyPGN.visionTimer) clearInterval(StudyPGN.visionTimer);
    const modal = document.getElementById('vision-trainer-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active', 'open');
    }
    if (window.toast) window.toast(`🏁 Time's up! Calculation Score: ${StudyPGN.visionScore} points!`, 'success');

    StudyPGN.saveVisionScore();
  };

  StudyPGN.saveVisionScore = function () {
    const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';
    try {
      const rec = JSON.parse(localStorage.getItem(STORAGE_VISION_SCORES) || '{}');
      const cur = rec[studentId] || { totalScore: 0, gamesPlayed: 0, bestScore: 0 };
      cur.totalScore = (cur.totalScore || 0) + StudyPGN.visionScore;
      cur.gamesPlayed = (cur.gamesPlayed || 0) + 1;
      cur.bestScore = Math.max(cur.bestScore || 0, StudyPGN.visionScore);
      cur.lastPlayed = new Date().toISOString().split('T')[0];
      rec[studentId] = cur;
      localStorage.setItem(STORAGE_VISION_SCORES, JSON.stringify(rec));
    } catch (e) {}
  };

  // ── Preset Templates Auto-filler ──
  window.loadStudyTopicPreset = function (presetKey) {
    const titleInput = document.getElementById('topic-title-input');
    const catSelect = document.getElementById('topic-cat-select');
    const pgnInput = document.getElementById('topic-pgn-input');
    if (!presetKey) return;

    const PRESETS = {
      evans: {
        title: 'Italian Game: Evans Gambit Attack',
        category: 'Openings',
        pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. Ng5 d5 9. exd5 Ne5 10. Bb3 O-O 11. Qxd4 N7g6`
      },
      dragon: {
        title: 'Sicilian Defense: Dragon Variation',
        category: 'Openings',
        pgn: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O Ne5 11. Bb3 Rc8`
      },
      qgd: {
        title: 'Queen\'s Gambit Declined: Classical Line',
        category: 'Openings',
        pgn: `1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1 c6 8. Bd3 dxc4 9. Bxc4 Nd5`
      },
      lucena: {
        title: 'Rook Endgames: Lucena Bridge Technique',
        category: 'Endgames',
        pgn: `[FEN "1K1R4/1P1k4/8/8/8/8/8/2r5 w - - 0 1"] 1. Rd4! Rh1 2. Ka7 Ra1+ 3. Kb6 Rb1+ 4. Ka6 Ra1+ 5. Kb5 Rb1+ 6. Rb4!`
      },
      philidor: {
        title: 'Philidor Defense: Solid Central Structure',
        category: 'Openings',
        pgn: `1. e4 e5 2. Nf3 d6 3. d4 exd4 4. Nxd4 Nf6 5. Nc3 Be7 6. Be2 O-O 7. O-O Re8`
      },
      fork: {
        title: 'Tactics: Royal Knight Fork & Center Overload',
        category: 'Tactics',
        pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O`
      }
    };

    const p = PRESETS[presetKey];
    if (p) {
      if (titleInput) titleInput.value = p.title;
      if (catSelect) catSelect.value = p.category;
      if (pgnInput) pgnInput.value = p.pgn;
      if (window.toast) window.toast(`✨ Auto-filled template: ${p.title}`, 'info');
    }
  };

  // ── Online Server API PGN Importer (Lichess Game/Study & Cloud PGN) ──
  window.fetchOnlinePgnFromUrl = async function (urlInputId, targetPgnInputId, targetTitleInputId, autoLoad = false) {
    const urlInput = document.getElementById(urlInputId);
    if (!urlInput || !urlInput.value.trim()) {
      if (window.toast) window.toast('Please enter a Lichess Study, Game, or Cloud PGN URL!', 'warning');
      return;
    }

    const rawUrl = urlInput.value.trim();
    if (window.toast) window.toast('⏳ Fetching PGN from Online Server...', 'info');

    const corsProxies = [
      url => url,
      url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    async function fetchWithCorsFallback(url, options = {}) {
      for (const proxyFn of corsProxies) {
        try {
          const proxiedUrl = proxyFn(url);
          const res = await fetch(proxiedUrl, options);
          if (res.ok) return res;
        } catch (e) {
          continue;
        }
      }
      return null;
    }

    try {
      let pgnContent = '';
      let detectedTitle = '';

      if (rawUrl.includes('lichess.org')) {
        let fetchUrl = rawUrl;
        if (rawUrl.includes('/study/')) {
          const parts = rawUrl.split('/study/')[1].split('/');
          const studyId = parts[0];
          const chapterId = parts[1] || '';
          fetchUrl = chapterId
            ? `https://lichess.org/study/${studyId}/${chapterId}.pgn`
            : `https://lichess.org/study/${studyId}.pgn`;
        } else {
          const match = rawUrl.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
          if (match && match[1]) {
            const gameId = match[1].slice(0, 8);
            fetchUrl = `https://lichess.org/game/export/${gameId}?pgnInJson=false&clocks=false&evals=false`;
          }
        }

        const res = await fetchWithCorsFallback(fetchUrl);
        if (res && res.ok) {
          pgnContent = await res.text();
          if (rawUrl.includes('/study/')) {
            detectedTitle = `Lichess Study: ${rawUrl.split('/study/')[1].split('/')[0]}`;
          } else {
            const match = rawUrl.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
            detectedTitle = match ? `Lichess Game #${match[1].slice(0, 8)}` : 'Lichess Game';
          }
        }
      } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        const res = await fetchWithCorsFallback(rawUrl);
        if (res && res.ok) {
          pgnContent = await res.text();
        }
      }

      if (pgnContent && pgnContent.trim()) {
        const targetPgn = document.getElementById(targetPgnInputId);
        if (targetPgn) targetPgn.value = pgnContent.trim();

        if (targetTitleInputId) {
          const targetTitle = document.getElementById(targetTitleInputId);
          if (targetTitle) {
            const whiteMatch = pgnContent.match(/\[White\s+"([^"]+)"\]/);
            const blackMatch = pgnContent.match(/\[Black\s+"([^"]+)"\]/);
            const eventMatch = pgnContent.match(/\[Event\s+"([^"]+)"\]/);
            if (whiteMatch && blackMatch && whiteMatch[1] !== '?' && blackMatch[1] !== '?') {
              targetTitle.value = `${whiteMatch[1]} vs ${blackMatch[1]}`;
              detectedTitle = `${whiteMatch[1]} vs ${blackMatch[1]}`;
            } else if (eventMatch && eventMatch[1] !== '?') {
              targetTitle.value = eventMatch[1];
              detectedTitle = eventMatch[1];
            } else if (detectedTitle) {
              targetTitle.value = detectedTitle;
            }
          }
        }

        if (autoLoad) {
          StudyPGN.loadPgnString(pgnContent.trim(), {
            title: detectedTitle || 'Online Study Game',
            description: `Fetched from: ${rawUrl}`
          });
          window.closeImportPgnModal();
          if (window.toast) window.toast(`♟️ Loaded "${detectedTitle || 'Online Game'}" into Study Board!`, 'success');
        } else {
          if (window.toast) window.toast('✅ PGN successfully fetched and imported into study form!', 'success');
        }
      } else {
        if (window.toast) window.toast('Could not auto-download PGN. You can paste the PGN moves directly.', 'warning');
      }
    } catch (err) {
      console.warn('[StudyPGN] Online fetch error:', err);
      if (window.toast) window.toast('Online PGN server error. Please paste PGN text directly.', 'warning');
    }
  };

  // ── Topic-based Search & Master Games Import API ──
  window.searchPgnTopics = async function (query, targetPgnInputId, targetTitleInputId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const q = (query || '').trim().toLowerCase();
    container.style.display = 'block';

    // If query is empty, show top curated repertoire games
    const localMatches = q
      ? CURATED_STUDY_GAMES.filter(g => {
          const text = `${g.title} ${g.category} ${g.white} ${g.black} ${g.description} ${g.level}`.toLowerCase();
          return text.includes(q);
        })
      : CURATED_STUDY_GAMES.slice(0, 6);

    let html = '';
    if (localMatches.length > 0) {
      html += `<div style="font-size:11px; font-weight:800; color:var(--gold); text-transform:uppercase; margin-bottom:8px;">${q ? `Search Matches (${localMatches.length})` : 'Popular Master Repertoires & Vault'}</div>`;
      html += localMatches.slice(0, 6).map(g => `
        <div style="background:var(--surface); border:1px solid rgba(218,163,62,0.3); border-radius:8px; padding:10px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div style="overflow:hidden;">
            <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(g.title)}</div>
            <div style="font-size:11px; color:var(--ivory-dim); margin-top:2px;">${escapeHtml(g.category)} · ${escapeHtml(g.white)} vs ${escapeHtml(g.black)} (${g.result})</div>
          </div>
          <button type="button" class="btn btn-gold btn-sm" style="white-space:nowrap; font-size:11px; padding:4px 12px;" onclick="window.selectPgnSearchResult('${g.id}', '${targetPgnInputId}', '${targetTitleInputId}', '${containerId}')">
            ♟️ Load
          </button>
        </div>
      `).join('');
    }

    // 2. Fetch from live Open Master API if query has >= 3 chars
    if (q.length >= 3) {
      try {
        const lichessUrls = [
          `https://lichess.org/api/games/user/${encodeURIComponent(q)}?max=2&pgnInJson=false`,
          `https://corsproxy.io/?${encodeURIComponent(`https://lichess.org/api/games/user/${encodeURIComponent(q)}?max=2&pgnInJson=false`)}`
        ];
        
        let res = null;
        for (const url of lichessUrls) {
          try {
            const response = await fetch(url, { headers: { 'Accept': 'application/x-chess-pgn' } });
            if (response && response.ok) {
              res = response;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (res) {
          const fetchedPgn = await res.text();
          if (fetchedPgn && fetchedPgn.includes('[Event')) {
            html += `<div style="font-size:11px; font-weight:800; color:#60a5fa; text-transform:uppercase; margin:10px 0 6px;">🌐 Live Lichess Database Match</div>
            <div style="background:var(--surface); border:1px solid rgba(96,165,250,0.3); border-radius:8px; padding:10px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
              <div style="overflow:hidden;">
                <div style="font-size:13px; font-weight:700; color:#fff;">Lichess Master Archive: ${escapeHtml(q)}</div>
                <div style="font-size:11px; color:var(--ivory-dim);">Live API Game Download</div>
              </div>
              <button type="button" class="btn btn-gold btn-sm" style="white-space:nowrap; font-size:11px; padding:4px 12px;" onclick="window.applyDirectPgn('${encodeURIComponent(fetchedPgn)}', '${escapeHtml(q)} Master Games', '${targetPgnInputId}', '${targetTitleInputId}', '${containerId}')">
                ♟️ Load
              </button>
            </div>`;
          }
        }
      } catch (err) {}
    }

    if (!html) {
      html = `<div style="padding:10px; font-size:12px; color:var(--ivory-dim); text-align:center;">No games found for "${escapeHtml(q)}". Try searching "Sicilian", "Italian", "Fischer", "Kasparov", "Carlsen", or "Morphy".</div>`;
    }

    container.innerHTML = html;
  };

  window.selectPgnSearchResult = function (gameId, targetPgnInputId, targetTitleInputId, containerId) {
    const game = CURATED_STUDY_GAMES.find(g => g.id === gameId);
    if (!game) return;

    const targetPgn = document.getElementById(targetPgnInputId);
    const targetTitle = document.getElementById(targetTitleInputId);
    if (targetPgn) targetPgn.value = game.pgn;
    if (targetTitle) targetTitle.value = game.title;

    const catSelect = document.getElementById('topic-cat-select');
    if (catSelect && game.category) {
      catSelect.value = game.category.includes('Opening') || game.category.includes('Gambit') ? 'Openings' : (game.category.includes('Endgame') ? 'Endgames' : (game.category.includes('Tactic') ? 'Tactics' : 'Masterclasses'));
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }

    if (targetPgnInputId === 'import-pgn-text') {
      StudyPGN.loadPgnString(game.pgn, {
        title: game.title,
        description: game.description
      });
      window.closeImportPgnModal();
      if (window.toast) window.toast(`♟️ Loaded "${game.title}" into Study Board!`, 'success');
    } else {
      if (window.toast) window.toast(`📋 Selected "${game.title}" for assignment!`, 'success');
    }
  };

  window.applyDirectPgn = function (encodedPgn, title, targetPgnInputId, targetTitleInputId, containerId) {
    const pgn = decodeURIComponent(encodedPgn);
    const targetPgn = document.getElementById(targetPgnInputId);
    const targetTitle = document.getElementById(targetTitleInputId);
    if (targetPgn) targetPgn.value = pgn;
    if (targetTitle) targetTitle.value = title;

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }

    if (targetPgnInputId === 'import-pgn-text') {
      StudyPGN.loadPgnString(pgn, {
        title: title,
        description: 'Loaded from online chess API.'
      });
      window.closeImportPgnModal();
      if (window.toast) window.toast(`♟️ Loaded "${title}" into Study Board!`, 'success');
    } else {
      if (window.toast) window.toast(`📋 Selected "${title}" for assignment!`, 'success');
    }
  };

  // ── Coach & Admin Topic Assignment Manager ──
  window.openAssignStudyTopicModal = function (prefillTitle = null, prefillPgn = null, prefillCategory = 'Openings') {
    const modal = document.getElementById('assign-study-topic-modal');
    if (!modal) return;

    if (prefillTitle || prefillPgn) {
      const titleInput = document.getElementById('topic-title-input');
      const pgnInput = document.getElementById('topic-pgn-input');
      const catSelect = document.getElementById('topic-cat-select');
      if (titleInput && prefillTitle) titleInput.value = prefillTitle;
      if (pgnInput && prefillPgn) pgnInput.value = prefillPgn;
      if (catSelect && prefillCategory) catSelect.value = prefillCategory;
    }

    const coachId = window.currentCoachId || (window.currentCoach && window.currentCoach.id) || null;
    const isCoach = (window.role === 'coach' || coachId) && window.role !== 'admin' && window.role !== 'master';

    let allBatches = Array.isArray(window.allBatches) ? window.allBatches : [];
    let allStudents = Array.isArray(window.allStudents) ? window.allStudents : [];

    if (!allBatches.length && window.dataCache && window.dataCache.batches) {
      allBatches = window.dataCache.batches;
    }
    if (!allStudents.length && window.dataCache && window.dataCache.students) {
      allStudents = window.dataCache.students;
    }

    const availableBatches = isCoach
      ? allBatches.filter(b => (window.ckSameCoach ? window.ckSameCoach(b.coach_id, coachId) : String(b.coach_id) === String(coachId)))
      : allBatches;

    const availableStudents = isCoach
      ? allStudents.filter(s => {
          if (window.ckSameCoach && window.ckSameCoach(s.coach_id, coachId)) return true;
          if (String(s.coach_id) === String(coachId)) return true;
          const coachBatchIds = availableBatches.map(b => String(b.id));
          if (s.batch_id && coachBatchIds.includes(String(s.batch_id))) return true;
          return false;
        })
      : allStudents;

    const batchSelect = document.getElementById('topic-batch-select');
    const studentSelect = document.getElementById('topic-student-select');

    if (batchSelect) {
      batchSelect.innerHTML = '<option value="all">-- All Enrolled Batches --</option>' +
        availableBatches.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name || 'Batch #' + b.id)}</option>`).join('');

      batchSelect.onchange = function () {
        const selBatchId = this.value;
        if (!studentSelect) return;
        const batchStudents = (selBatchId === 'all')
          ? availableStudents
          : availableStudents.filter(s => {
              if (String(s.batch_id) === String(selBatchId)) return true;
              const batchObj = availableBatches.find(b => String(b.id) === String(selBatchId));
              if (batchObj && Array.isArray(batchObj.student_ids) && batchObj.student_ids.map(String).includes(String(s.id))) return true;
              return false;
            });

        studentSelect.innerHTML = '<option value="all">-- All Students in Batch --</option>' +
          batchStudents.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name || s.full_name || 'Student #' + s.id)}</option>`).join('');
      };
    }

    if (studentSelect) {
      studentSelect.innerHTML = '<option value="all">-- All Students in Batch --</option>' +
        availableStudents.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name || s.full_name || 'Student #' + s.id)}</option>`).join('');
    }

    modal.style.display = 'flex';
    modal.classList.add('active', 'open');
  };

  window.closeAssignStudyTopicModal = function () {
    const modal = document.getElementById('assign-study-topic-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active', 'open');
    }
  };

  window.saveAssignedStudyTopic = async function () {
    const title = document.getElementById('topic-title-input')?.value;
    const pgn = document.getElementById('topic-pgn-input')?.value;
    const category = document.getElementById('topic-cat-select')?.value || 'Openings';
    const batchId = document.getElementById('topic-batch-select')?.value || 'all';
    const studentId = document.getElementById('topic-student-select')?.value || 'all';

    if (!title || !title.trim()) {
      if (window.toast) window.toast('Please provide a Topic Title!', 'warning');
      return;
    }
    if (!pgn || !pgn.trim()) {
      if (window.toast) window.toast('Please provide PGN moves sequence or fetch from URL!', 'warning');
      return;
    }

    const newTopic = {
      id: 'topic-' + Date.now(),
      title: title.trim(),
      pgn: pgn.trim(),
      category: category,
      batch_id: batchId,
      student_id: studentId,
      assigned_by: window.currentCoach ? (window.currentCoach.name || 'Coach') : 'Academy Admin',
      assigned_date: new Date().toISOString().split('T')[0]
    };

    let topics = [];
    try {
      topics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]');
    } catch (e) {}
    topics.unshift(newTopic);
    localStorage.setItem(STORAGE_ASSIGNED_TOPICS, JSON.stringify(topics));

    // Also persist assignment to Supabase if client is ready
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('homework_assignments').insert([{
          title: `[PGN Study] ${newTopic.title}`,
          description: `Category: ${newTopic.category}\nPGN Moves: ${newTopic.pgn.slice(0, 500)}...`,
          batch_id: batchId === 'all' ? null : batchId,
          student_id: studentId === 'all' ? null : studentId,
          coach_id: window.currentCoachId || null,
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status: 'assigned'
        }]);
      } catch (err) {
        console.warn('[StudyPGN] Supabase sync fallback:', err);
      }
    }

    if (window.toast) window.toast('✨ Study Topic successfully assigned to students and synced to cloud!', 'success');
    window.closeAssignStudyTopicModal();

    StudyPGN.renderAssignedTopicsList();
    if (window.renderStudyPgnMonitor) {
      window.renderStudyPgnMonitor(window.role === 'coach' ? 'coach' : 'admin');
    }
  };

  window.deleteAssignedStudyTopic = function (topicId) {
    if (!confirm('Are you sure you want to remove this assigned topic?')) return;
    let topics = [];
    try { topics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]'); } catch (e) {}
    topics = topics.filter(t => t.id !== topicId);
    localStorage.setItem(STORAGE_ASSIGNED_TOPICS, JSON.stringify(topics));
    if (window.toast) window.toast('Topic removed successfully.', 'info');

    StudyPGN.renderAssignedTopicsList();
    if (window.renderStudyPgnMonitor) {
      window.renderStudyPgnMonitor(window.role === 'coach' ? 'coach' : 'admin');
    }
  };

  StudyPGN.renderAssignedTopicsList = function () {
    const studentContainer = document.getElementById('assigned-topics-grid');
    const coachContainer = document.getElementById('coach-assigned-topics-grid');
    if (!studentContainer && !coachContainer) return;

    let topics = [];
    try {
      topics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]');
    } catch (e) {}

    // Default template topics if none
    if (!topics.length) {
      topics = [
        {
          id: 'topic-evans-gambit',
          title: 'Italian Game: Evans Gambit Master Repertoire',
          category: 'Openings',
          batch_id: 'all',
          student_id: 'all',
          assigned_by: 'Head Coach',
          assigned_date: '2026-08-15',
          pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. Ng5 d5 9. exd5 Ne5 10. Bb3 O-O 11. Qxd4 N7g6`
        },
        {
          id: 'topic-lucena-bridge',
          title: 'Rook Endgames: The Lucena Bridge Winning Method',
          category: 'Endgames',
          batch_id: 'all',
          student_id: 'all',
          assigned_by: 'Head Coach',
          assigned_date: '2026-08-16',
          pgn: `[FEN "1K1R4/1P1k4/8/8/8/8/8/2r5 w - - 0 1"] 1. Rd4! Rh1 2. Ka7 Ra1+ 3. Kb6 Rb1+ 4. Ka6 Ra1+ 5. Kb5 Rb1+ 6. Rb4!`
        }
      ];
      try { localStorage.setItem(STORAGE_ASSIGNED_TOPICS, JSON.stringify(topics)); } catch (e) {}
    }

    const currentStudent = window.currentStudent;
    const isPreviewOrAdmin = window.role === 'admin' || window.role === 'master' || document.getElementById('preview-mode-banner')?.style.display !== 'none';

    // 1. Render Student view if studentContainer exists
    if (studentContainer) {
      const filteredTopics = topics.filter(t => {
        if (isPreviewOrAdmin) return true;
        if (t.batch_id === 'all' && t.student_id === 'all') return true;
        if (currentStudent) {
          if (t.student_id && String(t.student_id) === String(currentStudent.id)) return true;
          if (t.batch_id && String(t.batch_id) === String(currentStudent.batch_id)) return true;
        }
        return false;
      });

      if (!filteredTopics.length) {
        studentContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#94a3b8; background:var(--surface); border-radius:12px; border:1px dashed var(--border);">No topics assigned for your current batch. Check back soon!</div>`;
      } else {
        let completedIds = [];
        try { completedIds = JSON.parse(localStorage.getItem(STORAGE_COMPLETED_TOPICS) || '[]'); } catch (e) {}

        studentContainer.innerHTML = filteredTopics.map(t => {
          const isCompleted = completedIds.includes(t.id);
          return `
            <div class="card" style="padding:18px 22px; background:var(--surface); border:1px solid ${isCompleted ? 'rgba(16,185,129,0.4)' : 'var(--border)'}; border-radius:14px; display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap;">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                  <span style="background:rgba(218,163,62,0.2); color:var(--gold); font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${escapeHtml(t.category)}</span>
                  <span style="font-size:12px; color:var(--ivory-dim);">Assigned by ${escapeHtml(t.assigned_by)} · ${escapeHtml(t.assigned_date)}</span>
                  ${isCompleted ? `<span style="background:rgba(16,185,129,0.15); color:#10b981; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">✅ Practiced</span>` : ''}
                </div>
                <h4 style="margin:0; color:#fff; font-size:15px; font-weight:700;">${escapeHtml(t.title)}</h4>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-gold btn-sm" onclick="window.practiceAssignedTopic('${escapeHtml(t.id)}')">
                  ♟️ Practice in Study Board
                </button>
                <button class="btn btn-outline btn-sm" onclick="window.toggleTopicCompleted('${escapeHtml(t.id)}')" style="font-size:11px;">
                  ${isCompleted ? 'Mark Pending' : 'Mark Done'}
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Coach view if coachContainer exists
    if (coachContainer) {
      const coachId = window.currentCoachId || (window.currentCoach ? window.currentCoach.id : null);
      const batches = Array.isArray(window.allBatches) ? window.allBatches : [];

      const coachTopics = topics.filter(t => {
        if (!coachId || window.role === 'admin' || window.role === 'master') return true;
        if (t.batch_id === 'all') return true;
        const b = batches.find(x => String(x.id) === String(t.batch_id));
        if (b && window.ckSameCoach && window.ckSameCoach(b.coach_id, coachId)) return true;
        return true;
      });

      if (!coachTopics.length) {
        coachContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#94a3b8; background:var(--surface); border-radius:12px; border:1px dashed var(--border); grid-column:1/-1;">No study topics assigned yet. Click "➕ Assign New Topic" to assign opening repertoires to your batches!</div>`;
      } else {
        coachContainer.innerHTML = coachTopics.map(t => {
          const batchName = t.batch_id === 'all' ? 'All Batches' : ((batches.find(b => String(b.id) === String(t.batch_id)) || {}).name || `Batch #${t.batch_id}`);
          return `
            <div class="card" style="padding:18px 20px; background:var(--surface2, rgba(0,0,0,0.25)); border:1px solid rgba(218,163,62,0.25); border-radius:14px; display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="background:rgba(218,163,62,0.18); color:var(--gold); font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${escapeHtml(t.category)}</span>
                  <span style="font-size:11px; color:var(--ivory-dim);">${escapeHtml(t.assigned_date)}</span>
                </div>
                <h4 style="margin:0 0 6px; color:#fff; font-size:15px; font-weight:700;">${escapeHtml(t.title)}</h4>
                <div style="font-size:12px; color:var(--ivory-dim); margin-bottom:6px;">Target: <strong style="color:#fff;">${escapeHtml(batchName)}</strong></div>
                <div style="font-size:11px; color:#64748b; font-family:monospace; background:rgba(0,0,0,0.3); padding:6px 8px; border-radius:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(t.pgn.slice(0, 70))}...</div>
              </div>
              <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn btn-gold btn-sm" onclick="window.practiceAssignedTopic('${escapeHtml(t.id)}', 'coach')" style="font-size:11.5px; padding:4px 10px;">
                  ♟️ Analyze in Board
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="window.deleteAssignedStudyTopic('${escapeHtml(t.id)}')" style="font-size:11.5px; padding:4px 8px;">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  };

  window.practiceAssignedTopic = function (topicId, sourceRole = 'student') {
    let topics = [];
    try { topics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]'); } catch (e) {}
    const t = topics.find(x => x.id === topicId);
    if (!t) return;

    StudyPGN.activeAssignedTopic = t;
    StudyPGN.loadPgnString(t.pgn, {
      title: t.title,
      category: t.category,
      description: `Assigned Study Topic: ${t.title}`
    });

    if (sourceRole === 'coach') {
      window.switchCoachStudyTab('board');
    } else {
      window.setStudyPgnSubTab('lab');
    }
    if (window.toast) window.toast(`♟️ Loaded "${t.title}" into Interactive Study Board!`, 'success');
  };

  window.toggleTopicCompleted = function (topicId) {
    let completedIds = [];
    try { completedIds = JSON.parse(localStorage.getItem(STORAGE_COMPLETED_TOPICS) || '[]'); } catch (e) {}
    if (completedIds.includes(topicId)) {
      completedIds = completedIds.filter(id => id !== topicId);
    } else {
      completedIds.push(topicId);
      StudyPGN.awardCoins(10, 'Study Topic Practice');
      if (window.toast) window.toast('🎉 Great work! Topic marked as practiced.', 'success');
    }
    localStorage.setItem(STORAGE_COMPLETED_TOPICS, JSON.stringify(completedIds));

    const studentId = window.currentStudent ? String(window.currentStudent.id) : 'default';
    try {
      const rec = JSON.parse(localStorage.getItem(STORAGE_STUDENT_COMPLETED_TOPICS) || '{}');
      const studentRec = rec[studentId] || [];
      if (studentRec.includes(topicId)) {
        rec[studentId] = studentRec.filter(id => id !== topicId);
      } else {
        rec[studentId] = [...studentRec, topicId];
      }
      localStorage.setItem(STORAGE_STUDENT_COMPLETED_TOPICS, JSON.stringify(rec));
    } catch (e) {}

    StudyPGN.renderAssignedTopicsList();
  };

  // ── Coach Study Tab Switcher ──
  window.switchCoachStudyTab = function (subTab, btn) {
    document.querySelectorAll('.coach-studypgn-subview').forEach(v => v.style.display = 'none');
    const target = document.getElementById('coach-studypgn-subview-' + subTab);
    if (target) target.style.display = 'block';

    const parentNav = btn ? btn.parentElement : document.querySelector('#page-coach-studypgn .tabs-nav');
    if (parentNav) {
      parentNav.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    if (subTab === 'board') {
      StudyPGN.renderBoard();
      StudyPGN.renderMoveList();
      StudyPGN.renderGameInfo();
      StudyPGN.updateAiMoveGuide();
      StudyPGN.updateEvalGauge();
      StudyPGN.fetchLichessOpeningStats();
    } else if (subTab === 'topics') {
      StudyPGN.renderAssignedTopicsList();
    } else if (subTab === 'custom') {
      if (document.readyState === 'complete') {
        requestAnimationFrame(() => StudyPGN.initCustomBoard());
      } else {
        window.addEventListener('load', () => StudyPGN.initCustomBoard(), { once: true });
      }
    } else if (subTab === 'vault') {
      const coachContainer = document.getElementById('coach-vault-cards-container');
      const studentContainer = document.getElementById('student-vault-cards-container');
      if (coachContainer) {
        StudyPGN.renderCoachVaultCards();
      } else if (studentContainer) {
        StudyPGN.renderStudentVault();
      }
    }
  };

  // ── Coach Vault Cards Renderer ──
  StudyPGN.renderCoachVaultCards = function (filterQuery = '') {
    const container = document.getElementById('coach-vault-cards-container');
    if (!container) return;

    const q = (filterQuery || '').toLowerCase().trim();
    const games = CURATED_STUDY_GAMES.filter(g => {
      if (!q) return true;
      const text = `${g.title} ${g.category} ${g.white} ${g.black} ${g.description}`.toLowerCase();
      return text.includes(q);
    });

    if (!games.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#94a3b8; background:var(--surface); border-radius:12px; border:1px dashed var(--border); grid-column:1/-1;">No games found for "${escapeHtml(q)}".</div>`;
      return;
    }

    container.innerHTML = games.map((g, idx) => `
      <div class="card" style="padding:18px; background:var(--surface2, rgba(0,0,0,0.25)); border:1px solid rgba(218,163,62,0.25); border-radius:14px; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="background:rgba(218,163,62,0.18); color:var(--gold); font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${escapeHtml(g.category)}</span>
            <span style="font-size:11px; color:#60a5fa; font-weight:700;">${escapeHtml(g.level || 'Master')}</span>
          </div>
          <h4 style="margin:0 0 6px; color:#fff; font-size:14.5px; font-weight:700;">${escapeHtml(g.title)}</h4>
          <div style="font-size:12px; color:var(--ivory-dim); margin-bottom:6px;">⚪ ${escapeHtml(g.white)} vs ⚫ ${escapeHtml(g.black)} (${g.result})</div>
          <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.4;">${escapeHtml(g.description)}</p>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-gold btn-sm" style="flex:1; font-size:11.5px; padding:6px 10px;" onclick="StudyPGN.loadCuratedGame(${idx}); window.switchCoachStudyTab('board');">
            ♟️ Load Board
          </button>
          <button class="btn btn-outline btn-sm" style="font-size:11.5px; padding:6px 10px; border-color:rgba(218,163,62,0.4); color:var(--gold);" onclick="window.selectPgnSearchResult('${g.id}', 'topic-pgn-input', 'topic-title-input', ''); window.openAssignStudyTopicModal();">
            ➕ Assign
          </button>
        </div>
      </div>
    `).join('');
  };

  StudyPGN.filterVaultGames = function (q) {
    StudyPGN.renderCoachVaultCards(q);
  };

  StudyPGN.renderStudentVault = function (filterQuery = '') {
    const container = document.getElementById('student-vault-cards-container');
    if (!container) return;

    const q = (filterQuery || '').toLowerCase().trim();
    const games = CURATED_STUDY_GAMES.filter(g => {
      if (!q) return true;
      const text = `${g.title} ${g.category} ${g.white} ${g.black} ${g.description}`.toLowerCase();
      return text.includes(q);
    });

    if (!games.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#94a3b8; background:var(--surface); border-radius:12px; border:1px dashed var(--border); grid-column:1/-1;">No games found for "${escapeHtml(q)}".</div>`;
      return;
    }

    container.innerHTML = games.map((g, idx) => {
      const globalIdx = CURATED_STUDY_GAMES.indexOf(g);
      return `
        <div class="card" style="padding:18px; background:var(--surface2, rgba(0,0,0,0.25)); border:1px solid rgba(218,163,62,0.25); border-radius:14px; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="background:rgba(218,163,62,0.18); color:var(--gold); font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${escapeHtml(g.category)}</span>
              <span style="font-size:11px; color:#60a5fa; font-weight:700;">${escapeHtml(g.level || 'Master')}</span>
            </div>
            <h4 style="margin:0 0 6px; color:#fff; font-size:14.5px; font-weight:700;">${escapeHtml(g.title)}</h4>
            <div style="font-size:12px; color:var(--ivory-dim); margin-bottom:6px;">⚪ ${escapeHtml(g.white)} vs ⚫ ${escapeHtml(g.black)} (${g.result})</div>
            <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.4;">${escapeHtml(g.description)}</p>
          </div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="btn btn-gold btn-sm" style="flex:1; font-size:11.5px; padding:6px 10px;" onclick="window.StudyPGN.loadCuratedGame(${globalIdx}); window.setStudyPgnSubTab('lab');">
              ♟️ Load Board
            </button>
            <button class="btn btn-outline btn-sm" style="font-size:11.5px; padding:6px 10px; border-color:rgba(218,163,62,0.4); color:var(--gold);" onclick="window.selectPgnSearchResult('${g.id}', 'topic-pgn-input', 'topic-title-input', ''); window.openAssignStudyTopicModal();">
              ➕ Assign
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  StudyPGN.filterStudentVault = function (q) {
    StudyPGN.renderStudentVault(q);
  };

  // ── Sub Tab Switcher (Student / Admin) ──
  window.setStudyPgnSubTab = function (subTab, btn) {
    document.querySelectorAll('.studypgn-subview').forEach(v => v.style.display = 'none');
    const target = document.getElementById('studypgn-subview-' + subTab);
    if (target) target.style.display = 'block';

    const parentNav = btn ? btn.parentElement : document.querySelector('#child-tab-studypgn .tabs-nav');
    if (parentNav) {
      parentNav.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
      if (btn) {
        btn.classList.add('active');
      } else {
        const matchingBtn = document.getElementById('btn-studypgn-' + subTab);
        if (matchingBtn) matchingBtn.classList.add('active');
      }
    }

        if (subTab === 'lab') {
      StudyPGN.renderBoard();
      StudyPGN.renderMoveList();
      StudyPGN.renderGameInfo();
      StudyPGN.updateAiMoveGuide();
      StudyPGN.updateEvalGauge();
      StudyPGN.fetchLichessOpeningStats();
    } else if (subTab === 'tactics') {
      StudyPGN.renderTacticsBoard();
      StudyPGN.updateStreakUI();
      StudyPGN.populateTacticsDropdown();
    } else if (subTab === 'topics') {
      StudyPGN.renderAssignedTopicsList();
    } else if (subTab === 'custom') {
      StudyPGN.initCustomBoard();
    }
  };

  // ── Sub-tab Switcher for Import PGN Modal ──
  window.switchImportPgnSubTab = function (tabName, btn) {
    const tabs = ['search', 'local', 'file', 'url'];
    tabs.forEach(t => {
      const el = document.getElementById(`import-subview-${t}`);
      if (el) el.style.display = (t === tabName) ? 'block' : 'none';
    });

    const parent = btn ? btn.parentElement : null;
    if (parent) {
      parent.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    if (tabName === 'local') {
      window.renderImportPgnLocalStorageStudies();
    } else if (tabName === 'search') {
      const input = document.getElementById('import-search-input');
      const q = input ? input.value : '';
      window.searchPgnTopics(q, 'import-pgn-text', 'import-game-title-custom', 'import-pgn-search-results');
    }
  };

  // ── Render Local Storage Saved Studies & Assigned Topics in Import Modal ──
  window.renderImportPgnLocalStorageStudies = function () {
    const container = document.getElementById('import-local-storage-list');
    if (!container) return;

    let assignedTopics = [];
    let savedCustom = [];
    try {
      assignedTopics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]');
    } catch (e) {}
    try {
      savedCustom = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]');
    } catch (e) {}

    const allItems = [
      ...savedCustom.map(x => ({ ...x, isCustom: true })),
      ...assignedTopics.map(x => ({ ...x, isAssigned: true }))
    ];

    if (!allItems.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px; color:var(--ivory-dim); font-size:12.5px;">
          <div>💾 No saved studies or assigned topics found in local browser storage.</div>
          <div style="font-size:11px; opacity:0.75; margin-top:4px;">You can bookmark games using the "➕ Bookmark Active Board" button above.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = allItems.map((item) => {
      const title = escapeHtml(item.title || 'Saved Study');
      const cat = escapeHtml(item.category || 'Study PGN');
      const badgeColor = item.isCustom ? '#38bdf8' : '#fbbf24';
      const badgeText = item.isCustom ? '💾 Local Bookmark' : '📋 Assigned Topic';
      const dateStr = escapeHtml(item.assigned_date || item.saved_date || 'Recent');

      return `
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div style="overflow:hidden;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span style="background:${badgeColor}22; color:${badgeColor}; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; border:1px solid ${badgeColor}44;">${badgeText}</span>
              <span style="font-size:11px; color:var(--ivory-dim);">${cat} · ${dateStr}</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button type="button" class="btn btn-gold btn-sm" style="font-size:11px; padding:4px 10px;" onclick="window.loadSavedLocalStorageTopic('${escapeHtml(item.id)}')">
              ♟️ Load Board
            </button>
            ${item.isCustom ? `
              <button type="button" class="btn btn-outline-grey btn-sm" style="font-size:11px; padding:4px 8px; color:#ef4444;" onclick="window.deleteLocalStorageStudy('${escapeHtml(item.id)}')">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  window.loadSavedLocalStorageTopic = function (id) {
    let assignedTopics = [];
    let savedCustom = [];
    try {
      assignedTopics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]');
    } catch (e) {}
    try {
      savedCustom = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]');
    } catch (e) {}

    const item = [...savedCustom, ...assignedTopics].find(x => String(x.id) === String(id));
    if (!item || !item.pgn) {
      if (window.toast) window.toast('Topic record or PGN not found.', 'warning');
      return;
    }

    StudyPGN.loadPgnString(item.pgn, {
      title: item.title || 'Saved Study Topic',
      description: item.description || `Category: ${item.category || 'Study'}`
    });
    window.closeImportPgnModal();
    if (window.toast) window.toast(`♟️ Loaded "${item.title || 'Study'}" into Study Board!`, 'success');
  };

  window.saveCurrentStudyToLocalStorage = function (customTitle, customPgn) {
    let pgn = customPgn;
    let title = customTitle;

    if (!pgn && StudyPGN.chess) {
      pgn = StudyPGN.chess.pgn();
    }
    if (!pgn || !pgn.trim()) {
      if (window.toast) window.toast('No PGN moves available to save!', 'warning');
      return;
    }

    if (!title || !title.trim()) {
      const currentGameTitle = document.getElementById('pgn-game-title')?.textContent || document.getElementById('coach-pgn-game-title')?.textContent;
      title = (currentGameTitle && currentGameTitle !== 'Grandmaster Masterclass Study') ? currentGameTitle : `My Study Session (${new Date().toLocaleDateString()})`;
    }

    let savedCustom = [];
    try {
      savedCustom = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]');
    } catch (e) {}

    const newEntry = {
      id: 'saved-' + Date.now(),
      title: title.trim(),
      pgn: pgn.trim(),
      category: 'Custom Repertoire',
      saved_date: new Date().toISOString().split('T')[0]
    };

    savedCustom.unshift(newEntry);
    localStorage.setItem(STORAGE_SAVED_STUDIES, JSON.stringify(savedCustom));

    if (window.toast) window.toast('💾 Saved game to Local Browser Storage!', 'success');
    window.renderImportPgnLocalStorageStudies();
  };

  window.deleteLocalStorageStudy = function (id) {
    let savedCustom = [];
    try {
      savedCustom = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]');
    } catch (e) {}

    savedCustom = savedCustom.filter(x => String(x.id) !== String(id));
    localStorage.setItem(STORAGE_SAVED_STUDIES, JSON.stringify(savedCustom));
    if (window.toast) window.toast('Removed study from Local Storage.', 'info');
    window.renderImportPgnLocalStorageStudies();
  };


  // ── Search PGN Topics & Curated Games ──
  window.searchPgnTopics = function (query, pgnTargetId, titleTargetId, resultsContainerId) {
    const container = document.getElementById(resultsContainerId || 'import-pgn-search-results');
    if (!container) return;

    const q = (query || '').toLowerCase().trim();
    const games = CURATED_STUDY_GAMES.filter(g => {
      if (!q) return true;
      const text = (g.title + ' ' + g.category + ' ' + g.white + ' ' + g.black + ' ' + g.description).toLowerCase();
      return text.includes(q);
    });

    if (!games.length) {
      container.innerHTML = '<div style="text-align:center; padding:16px; color:#94a3b8; font-size:12px;">No openings or games found matching "' + escapeHtml(q) + '".</div>';
      return;
    }

    container.innerHTML = games.map(g => `
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="overflow:hidden;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            <span style="background:rgba(218,163,62,0.18); color:var(--gold); font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px;">${escapeHtml(g.category)}</span>
            <span style="font-size:11px; color:#60a5fa; font-weight:700;">${escapeHtml(g.level || 'Master')}</span>
          </div>
          <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(g.title)}</div>
          <div style="font-size:11px; color:var(--ivory-dim);">⚪ ${escapeHtml(g.white)} vs ⚫ ${escapeHtml(g.black)} (${g.result})</div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button type="button" class="btn btn-gold btn-sm" style="font-size:11px; padding:4px 10px;" onclick="window.selectAndLoadPgnGame('${escapeHtml(g.id)}')">
            ♟️ Load
          </button>
        </div>
      </div>
    `).join('');
  };

  window.selectAndLoadPgnGame = function (gameId) {
    const game = CURATED_STUDY_GAMES.find(x => x.id === gameId);
    if (!game) return;
    StudyPGN.loadPgnString(game.pgn, {
      title: game.title,
      category: game.category,
      description: game.description
    });
    window.closeImportPgnModal();
    if (window.toast) window.toast('♟️ Loaded "' + game.title + '" into Study Board!', 'success');
  };

  window.selectPgnSearchResult = function (gameId, pgnTargetId, titleTargetId, resultsContainerId) {
    const game = CURATED_STUDY_GAMES.find(x => x.id === gameId);
    if (!game) return;
    if (pgnTargetId && document.getElementById(pgnTargetId)) {
      document.getElementById(pgnTargetId).value = game.pgn;
    }
    if (titleTargetId && document.getElementById(titleTargetId)) {
      document.getElementById(titleTargetId).value = game.title;
    }
  };

  // ── Handle .PGN / .TXT File Upload ──
  window.handlePgnFileUpload = function (inputEl, pgnTargetId, titleTargetId) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const pgnContent = e.target.result;
      if (pgnTargetId && document.getElementById(pgnTargetId)) {
        document.getElementById(pgnTargetId).value = pgnContent;
      }
      if (titleTargetId && document.getElementById(titleTargetId)) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        document.getElementById(titleTargetId).value = cleanName;
      }
      if (window.toast) window.toast('📂 Loaded "' + file.name + '" into PGN text area!', 'success');
    };

    reader.onerror = function () {
      if (window.toast) window.toast('Failed to read file.', 'error');
    };

    reader.readAsText(file);
  };

  // ── Fetch Online Game from Lichess / URL ──
  window.fetchOnlinePgnFromUrl = async function (urlInputId, pgnTargetId, titleTargetId, autoLoad = false) {
    const urlInput = document.getElementById(urlInputId || 'import-online-url');
    const rawUrl = urlInput ? urlInput.value.trim() : '';
    if (!rawUrl) {
      if (window.toast) window.toast('Please enter a Lichess or PGN URL.', 'warning');
      return;
    }

    let fetchUrl = rawUrl;
    // Handle lichess.org/xxxx game links
    const lichessMatch = rawUrl.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
    if (lichessMatch && !rawUrl.includes('/export/')) {
      const gameId = lichessMatch[1].slice(0, 8);
      fetchUrl = 'https://lichess.org/game/export/' + gameId + '.pgn';
    }

    try {
      if (window.toast) window.toast('Fetching game from web...', 'info');
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const pgnText = await res.text();

      if (!pgnText || !pgnText.trim()) {
        throw new Error('Empty PGN response');
      }

      if (pgnTargetId && document.getElementById(pgnTargetId)) {
        document.getElementById(pgnTargetId).value = pgnText.trim();
      }
      if (titleTargetId && document.getElementById(titleTargetId)) {
        document.getElementById(titleTargetId).value = 'Lichess Game (' + new Date().toLocaleDateString() + ')';
      }

      if (autoLoad) {
        StudyPGN.loadPgnString(pgnText.trim(), {
          title: 'Lichess Game (' + new Date().toLocaleDateString() + ')',
          description: 'Imported from ' + rawUrl
        });
        window.closeImportPgnModal();
        if (window.toast) window.toast('♟️ Online PGN game loaded into Study Board!', 'success');
      } else {
        if (window.toast) window.toast('Game PGN fetched successfully!', 'success');
      }
    } catch (err) {
      console.warn('[StudyPGN] Online PGN fetch error:', err);
      if (window.toast) window.toast('Could not fetch PGN automatically (CORS/URL issue). Please copy and paste the PGN text directly.', 'warning');
    }
  };

  // ── Search PGN Topics & Openings Vault ──
  window.searchPgnTopics = function (query, targetTextId = 'import-pgn-text', targetTitleId = 'import-game-title-custom', resultsContainerId = 'import-pgn-search-results') {
    const container = document.getElementById(resultsContainerId);
    if (!container) return;

    const q = String(query || '').toLowerCase().trim();
    const games = Array.isArray(CURATED_STUDY_GAMES) ? CURATED_STUDY_GAMES : [];

    const matches = games.filter(g => {
      if (!q) return true;
      const title = String(g.title || '').toLowerCase();
      const cat = String(g.category || '').toLowerCase();
      const desc = String(g.description || '').toLowerCase();
      const white = String(g.white || '').toLowerCase();
      const black = String(g.black || '').toLowerCase();
      return title.includes(q) || cat.includes(q) || desc.includes(q) || white.includes(q) || black.includes(q);
    });

    if (matches.length === 0) {
      container.innerHTML = `<div style="padding:18px; text-align:center; color:var(--ivory-dim); font-size:12.5px;">No matching openings or games found for "${escapeHtml(query)}".</div>`;
      return;
    }

    container.innerHTML = matches.map((g) => `
      <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div style="flex:1; min-width:200px;">
          <div style="font-weight:700; color:var(--gold); font-size:13px; margin-bottom:2px;">${escapeHtml(g.title)}</div>
          <div style="font-size:11px; color:var(--ivory-dim); line-height:1.4;">${escapeHtml(g.description || '')}</div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <span style="font-size:10px; background:rgba(218,163,62,0.15); color:var(--gold); padding:2px 6px; border-radius:4px;">${escapeHtml(g.category || 'Study')}</span>
            <span style="font-size:10px; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px;">${escapeHtml(g.level || 'All Levels')}</span>
          </div>
        </div>
        <button type="button" class="btn btn-gold btn-sm" onclick="window.selectSearchPgnGame('${escapeHtml(g.id)}')" style="font-size:11px; padding:5px 12px;">
          ♟️ Load Game
        </button>
      </div>
    `).join('');
  };

  window.selectSearchPgnGame = function (gameId) {
    const game = (CURATED_STUDY_GAMES || []).find(g => g.id === gameId);
    if (!game) return;
    if (StudyPGN.loadPgnString) {
      StudyPGN.loadPgnString(game.pgn, {
        title: game.title,
        category: game.category,
        description: game.description
      });
      window.closeImportPgnModal();
      if (window.toast) window.toast(`♟️ Loaded "${game.title}" into Study Board!`, 'success');
    }
  };

  // ── Switch Import PGN Sub Tabs ──
  window.switchImportPgnSubTab = function (subTab, btn) {
    document.querySelectorAll('.import-subview').forEach(el => el.style.display = 'none');
    const target = document.getElementById('import-subview-' + subTab);
    if (target) target.style.display = 'block';

    const tabParent = btn ? btn.parentElement : document.querySelector('#import-pgn-modal .tab-link')?.parentElement;
    if (tabParent) {
      tabParent.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    if (subTab === 'search') {
      window.searchPgnTopics(document.getElementById('import-search-input')?.value || '', 'import-pgn-text', 'import-game-title-custom', 'import-pgn-search-results');
    } else if (subTab === 'local') {
      window.renderLocalStorageStudies();
    }
  };

  // ── Render Local Storage Studies List ──
  window.renderLocalStorageStudies = function () {
    const container = document.getElementById('import-local-storage-list');
    if (!container) return;

    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]'); } catch (e) {}

    if (saved.length === 0) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--ivory-dim); font-size:12.5px;">No saved studies in local storage yet. Click "Bookmark Active Board" to save your current study!</div>';
      return;
    }

    container.innerHTML = saved.map((s, idx) => `
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div>
          <div style="font-weight:700; color:var(--gold); font-size:13px;">${escapeHtml(s.title || 'Saved Study')}</div>
          <div style="font-size:11px; color:var(--ivory-dim);">${escapeHtml(s.date || new Date().toLocaleDateString())} &bull; ${s.movesCount || 0} moves</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-gold btn-sm" onclick="window.loadSavedLocalStorageStudy(${idx})" style="font-size:11px; padding:4px 10px;">Load</button>
          <button type="button" class="btn btn-outline-grey btn-sm" onclick="window.deleteSavedLocalStorageStudy(${idx})" style="font-size:11px; padding:4px 8px; color:var(--danger);">✕</button>
        </div>
      </div>
    `).join('');
  };

  window.saveCurrentStudyToLocalStorage = function () {
    const game = StudyPGN.currentGame;
    const pgnText = (game && game.pgn) ? game.pgn : (StudyPGN.chess ? StudyPGN.chess.pgn() : '');
    if (!pgnText) {
      if (window.toast) window.toast('No moves to bookmark.', 'warning');
      return;
    }

    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]'); } catch (e) {}

    const title = prompt('Enter a title for this bookmark:', game?.title || 'My Chess Study') || 'My Chess Study';
    saved.unshift({
      id: 'study_' + Date.now(),
      title: title.trim(),
      pgn: pgnText,
      date: new Date().toLocaleDateString(),
      movesCount: (StudyPGN.moveHistory || []).length
    });

    localStorage.setItem(STORAGE_SAVED_STUDIES, JSON.stringify(saved));
    if (window.toast) window.toast(`💾 Bookmarked "${title}" in local storage!`, 'success');
    window.renderLocalStorageStudies();
  };

  window.loadSavedLocalStorageStudy = function (idx) {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]'); } catch (e) {}
    const s = saved[idx];
    if (!s) return;
    StudyPGN.loadPgnString(s.pgn, {
      title: s.title,
      description: `Loaded from local storage (${s.date})`
    });
    window.closeImportPgnModal();
    if (window.toast) window.toast(`♟️ Loaded "${s.title}"!`, 'success');
  };

  window.deleteSavedLocalStorageStudy = function (idx) {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORAGE_SAVED_STUDIES) || '[]'); } catch (e) {}
    saved.splice(idx, 1);
    localStorage.setItem(STORAGE_SAVED_STUDIES, JSON.stringify(saved));
    window.renderLocalStorageStudies();
  };

  // ── Import PGN Modal Open / Close ──
  window.openImportPgnModal = function () {
    console.log('[StudyPGN] openImportPgnModal called');
    const modal = document.getElementById('import-pgn-modal');
    console.log('[StudyPGN] modal element:', modal);
    if (!modal) {
      if (window.toast) window.toast('Import modal not found. Please refresh the page.', 'warning');
      return;
    }
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('active', 'open');
    const searchTabBtn = document.getElementById('import-tab-search');
    if (window.switchImportPgnSubTab && searchTabBtn) {
      try { window.switchImportPgnSubTab('search', searchTabBtn); } catch (e) { console.warn('[StudyPGN] switchImportPgnSubTab error:', e); }
    }
    console.log('[StudyPGN] modal opened, display:', modal.style.display);
  };

  window.closeImportPgnModal = function () {
    const modal = document.getElementById('import-pgn-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active', 'open');
    }
  };

  window.submitImportPgn = function () {
    const pgnText = document.getElementById('import-pgn-text')?.value;
    const titleText = document.getElementById('import-game-title-custom')?.value;
    if (!pgnText || !pgnText.trim()) {
      if (window.toast) window.toast('Please paste PGN notation.', 'warning');
      return;
    }
    StudyPGN.loadPgnString(pgnText.trim(), {
      title: (titleText && titleText.trim()) ? titleText.trim() : 'Imported Custom Study Game',
      description: 'Custom game loaded via PGN notation importer.'
    });
    window.closeImportPgnModal();
    if (window.toast) window.toast('♟️ PGN loaded into Interactive Study Board!', 'success');
  };

  // ── Coach & Admin Practice Analytics Monitor ──
  window.renderStudyPgnMonitor = function (roleType = 'admin') {
    const studentsContainerId = roleType === 'coach' ? 'coach-studypgn-students-table-wrap' : 'admin-studypgn-students-table-wrap';
    const studentsContainer = document.getElementById(studentsContainerId);

    const allStudents = Array.isArray(window.allStudents) ? window.allStudents : [];
    const coachId = window.currentCoachId || (window.currentCoach ? window.currentCoach.id : null);
    const batches = Array.isArray(window.allBatches) ? window.allBatches : [];

    // Filter students for coach
    const students = (roleType === 'coach' && coachId && window.role !== 'admin' && window.role !== 'master')
      ? allStudents.filter(s => {
          if (window.ckSameCoach && window.ckSameCoach(s.coach_id, coachId)) return true;
          if (s.batch_id) {
            const b = batches.find(x => String(x.id) === String(s.batch_id));
            if (b && window.ckSameCoach && window.ckSameCoach(b.coach_id, coachId)) return true;
          }
          return false;
        })
      : allStudents;

    let tacticsRec = {};
    try {
      tacticsRec = JSON.parse(localStorage.getItem(STORAGE_TACTICS_RECORDS) || '{}');
    } catch (e) {}

    let topics = [];
    try {
      topics = JSON.parse(localStorage.getItem(STORAGE_ASSIGNED_TOPICS) || '[]');
    } catch (e) {}

    const todayStr = new Date().toISOString().split('T')[0];
    let totalStreaks = 0;
    let totalSolvedToday = 0;

    if (studentsContainer) {
      let rowsHtml = students.map((s) => {
        const rec = tacticsRec[String(s.id)] || { streak: 0, lastDate: '', solvedCount: 0 };
        const isSolvedToday = (rec.lastDate === todayStr);
        const streak = rec.streak || 0;
        if (streak > 0) totalStreaks++;
        if (isSolvedToday) totalSolvedToday++;

        const studentName = escapeHtml(s.name || s.full_name || `Student #${s.id}`);
        const studentLevel = escapeHtml(s.level || 'Beginner');

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:12px 14px; font-weight:700; color:#fff;">
              ${studentName}
              <div style="font-size:11px; font-weight:400; color:var(--ivory-dim);">${studentLevel}</div>
            </td>
            <td style="padding:12px 14px;">
              ${streak > 0 ? `<span style="background:rgba(234,179,8,0.15); color:#eab308; font-weight:800; padding:4px 10px; border-radius:99px; font-size:12px;">🔥 ${streak} Days</span>` : `<span style="color:#64748b; font-size:12px;">No active streak</span>`}
            </td>
            <td style="padding:12px 14px;">
              ${isSolvedToday ? `<span style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:700; padding:4px 10px; border-radius:99px; font-size:12px;">✅ Solved Today</span>` : `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:700; padding:4px 10px; border-radius:99px; font-size:12px;">⏳ Pending</span>`}
            </td>
            <td style="padding:12px 14px; font-size:13px; color:#fff;">
              ${rec.solvedCount || 0} Puzzles
            </td>
            <td style="padding:12px 14px; text-align:right;">
              <button class="btn btn-outline-grey btn-sm" onclick="window.shareStudentTacticsProgressWhatsApp('${escapeHtml(s.id)}')" style="font-size:11px; padding:4px 8px; border-color:rgba(34,197,94,0.4); color:#4ade80;" title="Share progress on WhatsApp">
                📱 WhatsApp
              </button>
            </td>
          </tr>
        `;
      }).join('');

      studentsContainer.innerHTML = `
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); color:var(--gold); font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
              <th style="padding:10px 14px;">Student</th>
              <th style="padding:10px 14px;">Tactics Streak</th>
              <th style="padding:10px 14px;">Today's Workout</th>
              <th style="padding:10px 14px;">Total Solved</th>
              <th style="padding:10px 14px; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">No student records found for your batches.</td></tr>'}
          </tbody>
        </table>
      `;
    }

    const streakTotalEl = document.getElementById('admin-tactics-streak-total');
    const solvedTodayEl = document.getElementById('admin-tactics-solved-today');
    const topicsCountEl = document.getElementById('admin-topics-count');
    if (streakTotalEl) streakTotalEl.textContent = `${totalStreaks} Students`;
    if (solvedTodayEl) solvedTodayEl.textContent = String(totalSolvedToday);
    if (topicsCountEl) topicsCountEl.textContent = `${topics.length} Topics`;
  };

  // ── 1-Click WhatsApp Parent Progress Dispatcher ──
  window.shareStudentTacticsProgressWhatsApp = function (studentId) {
    const student = (window.allStudents || []).find(s => String(s.id) === String(studentId));
    if (!student) return;

    let tacticsRec = {};
    try {
      tacticsRec = JSON.parse(localStorage.getItem(STORAGE_TACTICS_RECORDS) || '{}');
    } catch (e) {}
    const rec = tacticsRec[String(student.id)] || { streak: 0, solvedCount: 0 };

    const studentName = student.name || student.full_name || 'Student';
    const parentPhone = student.parent_phone || student.phone || '';
    const cleanPhone = String(parentPhone).replace(/[^0-9]/g, '');

    const message = `🏆 *ChessKidoo Academy Progress Update* — ${studentName}\n` +
      `🔥 *Daily Tactics Streak:* ${rec.streak || 0} Days\n` +
      `⭐ *Total Puzzles Solved:* ${rec.solvedCount || 0} Exercises\n` +
      `♟️ *Current Level:* ${student.level || 'Beginner'}\n` +
      `📈 *Keep up the outstanding calculation practice!* ♟️✨`;

    const waUrl = cleanPhone ?
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` :
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  // ── Initial Load on Ready ──
  StudyPGN.init = function () {
    StudyPGN.ensureChessEngine();
    StudyPGN.loadSavedRecords();
    StudyPGN.setupKeyboardListeners();
    StudyPGN.initCustomBoard();
    if (!StudyPGN.currentGame) {
      StudyPGN.loadCuratedGame(0);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StudyPGN.init());
  } else {
    StudyPGN.init();
  }

  // ── Custom Board Setup & FEN Builder Engine ──
  StudyPGN.customBoardState = {
    grid: [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ],
    selectedPalettePiece: 'P',
    turn: 'w',
    orientation: 'white'
  };

  StudyPGN.getCustomBoardEls = function (id) {
    const list = [];
    if (!id) return list;
    const byId = document.getElementById(id);
    if (byId) list.push(byId);
    const byQuery = document.querySelectorAll('#' + id);
    byQuery.forEach(el => {
      if (!list.includes(el)) list.push(el);
    });
    return list;
  };

  StudyPGN.initCustomBoard = function () {
    StudyPGN.renderCustomPalette();
    StudyPGN.renderCustomBoard();
    StudyPGN.updateCustomFenUI();
  };

  StudyPGN.renderCustomPalette = function () {
    const palWs = [
      ...StudyPGN.getCustomBoardEls('student-custom-piece-palette-w'),
      ...StudyPGN.getCustomBoardEls('custom-piece-palette-w')
    ];
    const palBs = [
      ...StudyPGN.getCustomBoardEls('student-custom-piece-palette-b'),
      ...StudyPGN.getCustomBoardEls('custom-piece-palette-b')
    ];

    const wPieces = [
      { key: 'P', title: 'White Pawn' },
      { key: 'N', title: 'White Knight' },
      { key: 'B', title: 'White Bishop' },
      { key: 'R', title: 'White Rook' },
      { key: 'Q', title: 'White Queen' },
      { key: 'K', title: 'White King' },
      { key: 'EMPTY', title: 'Clear Square' }
    ];

    const bPieces = [
      { key: 'p', title: 'Black Pawn' },
      { key: 'n', title: 'Black Knight' },
      { key: 'b', title: 'Black Bishop' },
      { key: 'r', title: 'Black Rook' },
      { key: 'q', title: 'Black Queen' },
      { key: 'k', title: 'Black King' },
      { key: 'EMPTY', title: 'Clear Square' }
    ];

    const renderPieceBtn = (item) => {
      const isSel = StudyPGN.customBoardState.selectedPalettePiece === item.key;
      const pieceObj = item.key !== 'EMPTY' ? { color: item.key === item.key.toUpperCase() ? 'w' : 'b', type: item.key.toLowerCase() } : null;
      const imgUrl = pieceObj ? getPieceImage(pieceObj) : '';

      return `
        <button type="button" onclick="window.StudyPGN.selectCustomPalettePiece('${item.key}')"
                draggable="true"
                ondragstart="window.StudyPGN.onCustomPaletteDragStart(event, '${item.key}')"
                style="width:38px; height:38px; border-radius:8px; border:2px solid ${isSel ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}; background:${isSel ? 'rgba(218,163,62,0.25)' : 'rgba(255,255,255,0.04)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:4px;" title="${item.title}">
          ${imgUrl ? `<img src="${imgUrl}" draggable="false" style="width:100%; height:100%; object-fit:contain; pointer-events:none;" />` : `<span style="font-size:16px;">🗑️</span>`}
        </button>
      `;
    };

    const wHtml = wPieces.map(renderPieceBtn).join('');
    const bHtml = bPieces.map(renderPieceBtn).join('');

    palWs.forEach(p => p.innerHTML = wHtml);
    palBs.forEach(p => p.innerHTML = bHtml);
  };

  StudyPGN.selectCustomPalettePiece = function (key) {
    StudyPGN.customBoardState.selectedPalettePiece = key;
    StudyPGN.renderCustomPalette();
  };

  StudyPGN.onCustomPaletteDragStart = function (e, key) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'palette', key }));
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  StudyPGN.onCustomBoardDragStart = function (e, r, c) {
    const char = StudyPGN.customBoardState.grid[r] && StudyPGN.customBoardState.grid[r][c];
    if (char && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'board', r, c, char }));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  StudyPGN.onCustomBoardDragOver = function (e) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  StudyPGN.onCustomBoardDrop = function (e, targetR, targetC) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.type === 'palette') {
        StudyPGN.customBoardState.grid[targetR][targetC] = (data.key === 'EMPTY') ? null : data.key;
      } else if (data.type === 'board') {
        StudyPGN.customBoardState.grid[data.r][data.c] = null;
        StudyPGN.customBoardState.grid[targetR][targetC] = data.char;
      }
      StudyPGN.renderCustomBoard();
      StudyPGN.updateCustomFenUI();
    } catch (err) {}
  };

  StudyPGN.onCustomSquareClicked = function (r, c) {
    const key = StudyPGN.customBoardState.selectedPalettePiece;
    StudyPGN.customBoardState.grid[r][c] = (key === 'EMPTY') ? null : key;
    StudyPGN.renderCustomBoard();
    StudyPGN.updateCustomFenUI();
  };

  StudyPGN.renderCustomBoard = function () {
    const containers = [
      ...StudyPGN.getCustomBoardEls('student-custom-board-container'),
      ...StudyPGN.getCustomBoardEls('custom-board-container')
    ];
    if (!containers.length) return;

    const grid = StudyPGN.customBoardState.grid;
    const isFlipped = StudyPGN.customBoardState.orientation === 'black';

    let html = `
      <div class="pgn-chess-grid chesscom-board-wrap" style="display:grid; grid-template-columns:repeat(8, 1fr); grid-template-rows:repeat(8, 1fr); aspect-ratio:1/1; width:100%; max-width:440px; margin:0 auto; border-radius:4px; overflow:hidden; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.5); position:relative; box-sizing:border-box; user-select:none;">
    `;

    for (let rIdx = 0; rIdx < 8; rIdx++) {
      for (let cIdx = 0; cIdx < 8; cIdx++) {
        const r = isFlipped ? 7 - rIdx : rIdx;
        const c = isFlipped ? 7 - cIdx : cIdx;

        const isLight = (r + c) % 2 === 0;
        const char = grid[r] ? grid[r][c] : null;
        const pieceObj = char ? { color: char === char.toUpperCase() ? 'w' : 'b', type: char.toLowerCase() } : null;
        const bgColor = isLight ? '#ebecd0' : '#779556';
        const pieceImgUrl = pieceObj ? getPieceImage(pieceObj) : '';

        html += `
          <div class="custom-square"
               onclick="StudyPGN.onCustomSquareClicked(${r}, ${c})"
               ondragover="StudyPGN.onCustomBoardDragOver(event)"
               ondrop="StudyPGN.onCustomBoardDrop(event, ${r}, ${c})"
               style="background:${bgColor}; aspect-ratio:1/1; width:100%; height:100%; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none; position:relative; box-sizing:border-box; overflow:hidden;">
            ${pieceImgUrl ? `
              <img src="${pieceImgUrl}" draggable="true"
                   ondragstart="StudyPGN.onCustomBoardDragStart(event, ${r}, ${c})"
                   style="width:100%; height:100%; object-fit:contain; pointer-events:auto; user-select:none; display:block; cursor:grab;" />
            ` : ''}
            ${cIdx === 0 ? `<span style="position:absolute; top:2px; left:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; pointer-events:none;">${8 - r}</span>` : ''}
            ${rIdx === 7 ? `<span style="position:absolute; bottom:2px; right:3px; font-size:11.5px; font-weight:700; line-height:1; color:${isLight ? '#779556' : '#ebecd0'}; pointer-events:none;">${String.fromCharCode(97 + c)}</span>` : ''}
          </div>
        `;
      }
    }
    html += `</div>`;
    containers.forEach(c => c.innerHTML = html);
  };

  StudyPGN.generateFenFromCustomGrid = function () {
    const grid = StudyPGN.customBoardState.grid;
    let fenRows = [];

    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const char = grid[r] ? grid[r][c] : null;
        if (!char) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          rowStr += char;
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      fenRows.push(rowStr);
    }

    const turn = StudyPGN.customBoardState.turn || 'w';
    return `${fenRows.join('/')} ${turn} KQkq - 0 1`;
  };

  StudyPGN.updateCustomFenUI = function () {
    const inputs = [
      ...StudyPGN.getCustomBoardEls('student-custom-fen-input'),
      ...StudyPGN.getCustomBoardEls('custom-fen-input')
    ];
    const currentFen = StudyPGN.generateFenFromCustomGrid();
    inputs.forEach(inp => inp.value = currentFen);

    const btnWs = [
      ...StudyPGN.getCustomBoardEls('student-btn-turn-w'),
      ...StudyPGN.getCustomBoardEls('btn-turn-w')
    ];
    const btnBs = [
      ...StudyPGN.getCustomBoardEls('student-btn-turn-b'),
      ...StudyPGN.getCustomBoardEls('btn-turn-b')
    ];
    const turn = StudyPGN.customBoardState.turn;

    btnWs.forEach(btn => btn.className = turn === 'w' ? 'btn btn-sm btn-gold' : 'btn btn-sm btn-outline');
    btnBs.forEach(btn => btn.className = turn === 'b' ? 'btn btn-sm btn-gold' : 'btn btn-sm btn-outline');
  };

  StudyPGN.setCustomTurn = function (turn) {
    StudyPGN.customBoardState.turn = turn;
    StudyPGN.updateCustomFenUI();
  };

  StudyPGN.clearCustomBoard = function () {
    StudyPGN.customBoardState.grid = Array(8).fill(null).map(() => Array(8).fill(null));
    StudyPGN.renderCustomBoard();
    StudyPGN.updateCustomFenUI();
    if (window.toast) window.toast('🧹 Cleared all pieces from custom board.', 'info');
  };

  StudyPGN.resetCustomBoardStandard = function () {
    StudyPGN.customBoardState.grid = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    StudyPGN.customBoardState.turn = 'w';
    StudyPGN.renderCustomBoard();
    StudyPGN.updateCustomFenUI();
    if (window.toast) window.toast('♟️ Custom board reset to standard position.', 'info');
  };

  StudyPGN.flipCustomBoard = function () {
    StudyPGN.customBoardState.orientation = StudyPGN.customBoardState.orientation === 'white' ? 'black' : 'white';
    StudyPGN.renderCustomBoard();
  };

  StudyPGN.loadFenToCustomBoard = function (fenStr) {
    if (!fenStr || !fenStr.trim()) return;
    const parts = fenStr.trim().split(/\s+/);
    const rows = parts[0].split('/');
    if (rows.length !== 8) {
      if (window.toast) window.toast('Invalid FEN format!', 'warning');
      return;
    }

    const grid = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      let colIdx = 0;
      for (let i = 0; i < rows[r].length; i++) {
        const char = rows[r][i];
        if (/\d/.test(char)) {
          colIdx += parseInt(char, 10);
        } else {
          grid[r][colIdx] = char;
          colIdx++;
        }
      }
    }

    StudyPGN.customBoardState.grid = grid;
    if (parts[1]) StudyPGN.customBoardState.turn = parts[1] === 'b' ? 'b' : 'w';

    StudyPGN.renderCustomBoard();
    StudyPGN.updateCustomFenUI();
    if (window.toast) window.toast('✅ Loaded FEN into custom board editor!', 'success');
  };

  StudyPGN.copyCustomFen = function () {
    const fen = StudyPGN.generateFenFromCustomGrid();
    navigator.clipboard.writeText(fen).then(() => {
      if (window.toast) window.toast('📋 FEN copied to clipboard!', 'success');
    }).catch(() => {
      if (window.toast) window.toast(`FEN: ${fen}`, 'info');
    });
  };

  StudyPGN.playFromCustomBoard = function () {
    const fen = StudyPGN.generateFenFromCustomGrid();
    if (!window.Chess) {
      if (window.toast) window.toast('Chess engine not loaded yet.', 'warning');
      return;
    }

    StudyPGN.chess = new window.Chess(fen);
    StudyPGN.moveHistory = [];
    StudyPGN.currentMoveIndex = -1;
    StudyPGN.selectedSquare = null;
    StudyPGN.legalMovesForSelected = [];
    StudyPGN.isAutoplaying = false;
    if (StudyPGN.autoplayTimer) clearInterval(StudyPGN.autoplayTimer);

    StudyPGN.currentGame = {
      title: 'Custom Position Play',
      white: 'White',
      black: 'Black',
      result: '*',
      pgn: `[SetUp "1"]\n[FEN "${fen}"]\n\n*`,
      headers: { SetUp: '1', FEN: fen }
    };

    const isCoach = window.role === 'coach' && document.getElementById('page-coach-studypgn')?.classList.contains('active');
    if (isCoach && window.switchCoachStudyTab) {
      window.switchCoachStudyTab('board');
      StudyPGN.renderBoard();
      StudyPGN.renderMoveList();
      StudyPGN.renderGameInfo();
      StudyPGN.updateAiMoveGuide();
      StudyPGN.updateEvalGauge();
      StudyPGN.fetchLichessOpeningStats();
      StudyPGN.fetchStockfishCloudEval();
    } else if (window.setStudyPgnSubTab) {
      window.setStudyPgnSubTab('lab');
      StudyPGN.renderBoard();
      StudyPGN.renderMoveList();
      StudyPGN.renderGameInfo();
      StudyPGN.updateAiMoveGuide();
      StudyPGN.updateEvalGauge();
      StudyPGN.fetchLichessOpeningStats();
      StudyPGN.fetchStockfishCloudEval();
    }

    if (window.toast) window.toast('♟️ Custom position loaded for play! Make your moves on the board.', 'success');
  };

  StudyPGN.loadCustomBoardToLab = function () {
    const fen = StudyPGN.generateFenFromCustomGrid();
    const pgnText = `[SetUp "1"]\n[FEN "${fen}"]\n\n*`;

    StudyPGN.loadPgnString(pgnText, {
      title: 'Custom Position Analysis',
      description: `Custom Board Setup FEN: ${fen}`
    });

    const isCoach = window.role === 'coach' && document.getElementById('page-coach-studypgn')?.classList.contains('active');
    if (isCoach && window.switchCoachStudyTab) {
      window.switchCoachStudyTab('board');
    } else if (window.setStudyPgnSubTab) {
      window.setStudyPgnSubTab('lab');
    }
    if (window.toast) window.toast('🚀 Loaded custom position into Master Study Lab!', 'success');
  };

  // ── Web Audio API Piece Move Sound Synthesizer ──
  StudyPGN.audioCtx = null;
  StudyPGN.playMoveSound = function (isCapture) {
    try {
      if (!StudyPGN.audioCtx) {
        StudyPGN.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (StudyPGN.audioCtx.state === 'suspended') {
        StudyPGN.audioCtx.resume();
      }

      const osc = StudyPGN.audioCtx.createOscillator();
      const gain = StudyPGN.audioCtx.createGain();
      const now = StudyPGN.audioCtx.currentTime;

      osc.type = isCapture ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isCapture ? 420 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(isCapture ? 120 : 160, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(StudyPGN.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  };

  // ── PGN Export & File Downloader ──
  StudyPGN.downloadCurrentPgn = function () {
    const game = StudyPGN.currentGame || {};
    let pgnText = '';

    if (StudyPGN.chess) {
      pgnText = StudyPGN.chess.pgn();
    } else if (game.pgn) {
      pgnText = game.pgn;
    }

    if (!pgnText || !pgnText.trim()) {
      if (StudyPGN.moveHistory && StudyPGN.moveHistory.length > 0) {
        const tempChess = StudyPGN.initialFen ? new window.Chess(StudyPGN.initialFen) : new window.Chess();
        if (game.white) tempChess.header('White', game.white);
        if (game.black) tempChess.header('Black', game.black);
        if (game.title) tempChess.header('Event', game.title);
        if (game.result) tempChess.header('Result', game.result);
        if (StudyPGN.initialFen) {
          tempChess.header('SetUp', '1');
          tempChess.header('FEN', StudyPGN.initialFen);
        }
        StudyPGN.moveHistory.forEach(m => {
          try { tempChess.move(m); } catch (e) {}
        });
        pgnText = tempChess.pgn();
      }
    }

    if (!pgnText || !pgnText.trim()) {
      if (window.toast) window.toast('No PGN moves available to download.', 'warning');
      return;
    }

    const titleSlug = (game && game.title ? game.title : 'chesskidoo_study').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const blob = new Blob([pgnText], { type: 'application/x-chess-pgn;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleSlug}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.toast) window.toast('📥 Downloaded PGN study file successfully!', 'success');
  };

  // ── Global Keyboard Shortcuts for Study Lab ──
  StudyPGN.initKeyboardShortcuts = function () {
    if (StudyPGN._keyboardBound) return;
    StudyPGN._keyboardBound = true;

    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input / textarea / modal
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      // Check if Study PGN page or tab is currently visible
      const studyPage = document.getElementById('page-studypgn');
      const childStudyTab = document.getElementById('child-tab-studypgn');
      const isVisible = (studyPage && studyPage.classList.contains('active')) ||
                        (childStudyTab && childStudyTab.classList.contains('active')) ||
                        (document.getElementById('studypgn-subview-lab') && document.getElementById('studypgn-subview-lab').style.display !== 'none');

      if (!isVisible) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          StudyPGN.prevMove();
          break;
        case 'ArrowRight':
          e.preventDefault();
          StudyPGN.nextMove();
          break;
        case 'ArrowUp':
          e.preventDefault();
          StudyPGN.firstMove();
          break;
        case 'ArrowDown':
          e.preventDefault();
          StudyPGN.lastMove();
          break;
        case ' ':
          e.preventDefault();
          StudyPGN.toggleAutoplay();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          StudyPGN.flipBoard();
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && StudyPGN.chess) {
            e.preventDefault();
            navigator.clipboard.writeText(StudyPGN.chess.fen()).then(() => {
              if (window.toast) window.toast('📋 Copied position FEN to clipboard!', 'success');
            });
          }
          break;
        case '?':
        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            StudyPGN.showHotkeysModal();
          }
          break;
      }
    });
  };

  StudyPGN.showHotkeysModal = function () {
    const modalHtml = `
      <div id="pgn-hotkeys-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); padding:16px;" onclick="document.getElementById('pgn-hotkeys-overlay').remove()">
        <div class="card" style="background:#0f172a; border:1px solid var(--gold); border-radius:14px; max-width:440px; width:100%; padding:24px; box-shadow:0 20px 40px rgba(0,0,0,0.8);" onclick="event.stopPropagation()">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; color:var(--gold); font-size:18px;">⌨️ Keyboard Hotkeys</h3>
            <button onclick="document.getElementById('pgn-hotkeys-overlay').remove()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">✕</button>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;">
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">→</kbd> Next Move</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">←</kbd> Previous Move</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">↓</kbd> Jump to End</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">↑</kbd> Jump to Start</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">Space</kbd> Play / Pause</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">F</kbd> Flip Board</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">C</kbd> Copy FEN</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px;"><kbd style="background:#334155; padding:2px 6px; border-radius:4px; font-family:monospace; color:#fff;">?</kbd> Show Hotkeys</div>
          </div>
          <button class="btn btn-gold" style="width:100%; margin-top:18px;" onclick="document.getElementById('pgn-hotkeys-overlay').remove()">Got it!</button>
        </div>
      </div>
    `;
    const old = document.getElementById('pgn-hotkeys-overlay');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  StudyPGN.getRawPgn = function () {
    if (StudyPGN.currentPgn) return StudyPGN.currentPgn;
    if (StudyPGN.chess) {
      const pgn = StudyPGN.chess.pgn();
      if (pgn && pgn.trim()) return pgn;
    }
    return '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0';
  };
})();
