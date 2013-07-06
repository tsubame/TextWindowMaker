/**
 * 台本を読み込むモジュール
 * 
 * 処理手順
 * 
 * 改行コード変換 （\nに統一）
 * 台詞の区切り文字取得
 * HTMLならテキストを抜き出す
 * 台詞の前の役名を取得
 * 最初の台詞の位置を取得
 * 
 */
function ScriptParser() {

	// 台詞の区切り文字
	this.delmChar = '';
	// 上記の区切り文字の出現回数
	this.delmCount = 0;

	// 台本部分のテキスト
	this.script = '';
	
	// テキストウィンドウのメッセージ
	// オブジェクトの配列
	//
	// charName:  
	// message:
	// isNaration:
	this.textMessages = [];

	// キャラ名（台詞前の表記）の配列
	this.charSNames = [];
	
	// 最初の台詞の開始位置のインデックス
	this.firstMsgIndex = 1000000;
	// 最後のセリフの終了位置のインデックス
	this.lastMsgEndIndex = 0;
	// 台本の開始箇所のインデックス
	this.scriptStartIndex = null;
	
	// 台詞間の改行
	this.lfBtMsg = '';
	// 台詞間の改行の数
	this.lfLengthBtMsg = 1;
	// 台詞間の改行の数が一定かどうか
	this.isLfBtMsgFixed = true;
	// 2番めに多い台詞間の改行
	this.lfBtMsgSecond = '';
	
	// テーブルの前にあるテキスト
	this.preTableTexts = [];
	
	
	/**
	 * 処理実行
	 * 
	 * @return Array 
	 */
	this.exec = function(text) {
		// 改行コードを変換
		text = this.convertCrToLf(text);
		// 台詞の区切り文字を取得
		this._searchDelimter(text);
		console.warn('区切り文字は ' + this.delmChar + '　出現回数:' + this.delmCount);
		// HTMLか判定　違えば終了
		var isHtml = this._checkIsHtml(text);
		if (isHtml === true) {
			var htmlParser = new HtmlParser();
			//this.messages = htmlParser.exec();
			text = htmlParser.exec(text);
		}

		// キャラ名を取得
		this._pickupCharSNames(text);
		// 最初と最後の台詞の位置を検索
		this._searchMsgIndex(text);
		// 台本の最初の位置を検索
		this._searchScriptStartIndex(text);
		// 台本を抜き出す
		this._pickupScript(text);
//console.info(this.script);		
// 台本を整形（先頭の空白を外す）
this._formatScript(this.script);
		// 台詞、ナレーションを抜き出す
		this._pickupTextMessages(this.script );

		// テキストの整形
		//this._formatMessages
		
		console.info(this.script);
		
		return this.textMessages;
	}
	
	/**
	 * 改行コードを変換
	 * \r、\r\nを\nに統一
	 * 
	 * @param  String text
	 * @return String cText
	 */
	 this.convertCrToLf = function(text) {
		var cText = text.replace(/\r\n/gm, "\n");	
		cText = cText.replace(/\r/gm, "\n");	
		
		return cText;
	}
	
	/**
	 * 台詞の区切り文字が何か調べて this.delm に設定する
	 * 出現数が少ない場合はnullを設定
	 *
	 * @params String text
	 */
	this._searchDelimter = function(text) {
// 定数化したい
		// 区切り文字のリストと正規表現
		var delms = ['「', '『', '：', ':'];
		var delmsPattern = [/「/gm, /『/gm, /：/gm, /[^\w]:[^\w]/gm]; // 半角の:はURLで多用されるのでアルファベットと隣接してるものを省く
		// 区切り文字とみなす最小の出現数
		var minRegDelmCount = 10;
//		
		// それぞれの区切り文字の出現回数
		var matchCounts = [];
		
		for (var i in delms) {
			var matches = text.match(delmsPattern[i]);
			if (matches !== null) {
				matchCounts[i] = matches.length;
			} else {
				matchCounts[i] = 0;
			}			
			//console.info(delms[i] + ' の出現回数：' + matchCounts[i]);
		}
		
		// 一番出現数の多い区切り文字を取得
		var mostFindCount = 0;
		for (var i in delms) {
			if (mostFindCount < matchCounts[i]) {
				mostFindCount = matchCounts[i];
				this.delmChar = delms[i];
			}
		}
		
		if (mostFindCount < minRegDelmCount) {
			console.warn('区切り文字でない可能性があります！');
			this.delmChar = null;
		}
		this.delmCount = mostFindCount;
	}
	
	/**
	 * HTMLか判定する
	 * 
	 * @param String text
	 * @return Bool
	 */
	this._checkIsHtml = function(text) {
		if (text === null) {
			return false;
		} 
		try { 
			var match = text.match(/<(html|xml|xhtml)/mi);
			if (match !== null) {
				return true;
			}
		} catch (e) {
			console.info(e);
		}
		
		return false;
	}

	/**
	 * キャラ名（台詞前の表記）を抽出
	 * 
	 * this.charSNamesにセットする
	 * 同じ名前の表記が2つ以上あれば役名とみなす
	 * 長すぎる役名はスキップ（役名じゃないとみなす）
	 * 
	 * @param String text
	 */
	this._pickupCharSNames = function(text) {
		// これ以上の文字数の役名はスキップ
		var skipStrLength = 10;
		// 区切り文字の前の文字列を抽出
		var regPtn = new RegExp('^[^：:「『\n]*?' + this.delmChar, 'gmi');
		var strBeforeMsgs = text.match(regPtn);
		//console.info(strBeforeMsgs);
		if (strBeforeMsgs === null) {
			return;
		}
		
		while(0 < strBeforeMsgs.length) {
			var str = strBeforeMsgs.shift();
			// 長い文字列や♀、♂が含まれた役名はスキップ
			if (skipStrLength < str.length) { 
				continue;
			} else if (str.match(/♀/) || str.match(/♂/)) { // ♀、♂が含まれた役名は役名紹介の可能性が高いのでスキップ
				continue;
			}			
			// 他に同じ名前がなければスキップ
			if (strBeforeMsgs.indexOf(str) === -1) {
				continue;
			}
			// 配列に挿入済みでなければ挿入
			if (this.charSNames.indexOf(str) === -1) {
				this.charSNames.push(str);
			}
		}

		console.info(this.charSNames);
	}
	
	/**
	 * 台本の最初の台詞の位置、最後の台詞の位置を取得
	 * 
	 * this.firstMsgIndex、this.lastMsgIndexにセットする
	 * 
	 * @param String text
	 */
	this._searchMsgIndex = function(text) {
		var firstMsgIndex = text.length;
		var lastMsgIndex  = 0;
		
		// 役の数ループ
		for (var i in this.charSNames) {
			// 役の台詞のうち最初の台詞を取得
			var index = this._searchCharFirstMsgIndex(text, this.charSNames[i]);
			if (index < firstMsgIndex) {
				firstMsgIndex = index;
			}
			// 役の台詞のうち最後の台詞を取得
			var lastIndex = text.lastIndexOf(this.charSNames[i]);
			if (lastMsgIndex < lastIndex) {
				lastMsgIndex = lastIndex;
			}
		}
		
		this.firstMsgIndex = firstMsgIndex;
		// デバッグ用
		console.warn('【最初の台詞】\n' + text.substr(this.firstMsgIndex, 20));
		// 最後の台詞の終了位置を取得
		var lastMsg = this._searchLastMsg(text, lastMsgIndex);
		this.lastMsgEndIndex = text.lastIndexOf(lastMsg) + lastMsg.length;
	}
	
	/**
	 * 役別の台詞で最初の台詞を取得
	 * 
	 * 役名の後に♂♀が入る箇所は役紹介の可能性が高いため除く
	 * 
	 * @param  String  text
	 * @param  Integer charSName　役名
	 * @return Integer index
	 */
	this._searchCharFirstMsgIndex = function(text, charSName) {
		var regPtn = new RegExp('^' + charSName + '[^♂♀：:]*\n', 'mi');
		var charFirstMsg = text.match(regPtn);
//console.info(charFirstMsg);		
		if (charFirstMsg === null) {
			return text.length;
		}
		var index = text.indexOf(charFirstMsg);

		return index;
	}
	
	/**
	 * 台本の最後の台詞らしき部分を取得
	 * 確実には取得できない
	 * 
	 * @param  String  text
	 * @param  Integer lastMsgIndex
	 * @return String  lastMsg
	 */
	this._searchLastMsg = function(text, lastMsgIndex) {		
		var bottomText  = text.substr(lastMsgIndex, 180);
		var bottomMsg   = bottomText.match(/[^\n]\n\n/mi);
		var bottomIndex = bottomText.indexOf(bottomMsg);
		var lastMsg = bottomText.substr(0, bottomIndex + 1);
		
		console.warn('【最後の台詞】\n' + lastMsg);
		
		return lastMsg;
	}
	
	/**
	 * 台本の開始箇所を調べる
	 * 
	 * 線（3個以上連続する文字）があった場合（例： ---、ーーー）はその下の行
	 *   複数ある場合は台詞の前の部分の最後の線
	 * 
	 * 
	 * 
	 * @param String text
	 * @return Integer startIndex (台本の何文字目か)
	 */
	this._searchScriptStartIndex = function(text) {
		// 台本の開始を示す線の終了位置を取得
		var result = this._searchScriptStartIndexByLine(text);
		// 取得できなければ
		if (result === false) {
			this._searchScriptStartIndexByLf(text);
		}
	}
	
	/**
	 * 区切り線の箇所を取得
	 * 
	 * 
	 * @param String text
	 * @return Bool 取得できなければfalse
	 */
	this._searchScriptStartIndexByLine = function(text) {
		// 最初の台詞の前のテキストを抜き出す
		var headText = text.substr(0, this.firstMsgIndex);
		var lineStr = null;
		// 線（━━、＿＿、）、同じ文字の繰り返しを取得		
		var matches = headText.match(/([^\w\s　・….!！（）\(\)ぁ-んァ-ン])\1\1.*?\n/gmi);
		// 一番最後の線の場所
		var lastLineIndex = 0;
		
		if (matches !== null) {
			for (var i in matches) {
				var index = headText.lastIndexOf(matches[i]);
				if (lastLineIndex < index) {
					lastLineIndex = index;
					lineStr = matches[i];
				}
			}
			
			this.scriptStartIndex = lastLineIndex + lineStr.length;
			console.info('台本の開始箇所を示す文字列は ' + lineStr);
			console.info('【台本の開始箇所】' + text.substr(this.scriptStartIndex, 20));
			
			return true;
		} else {
			console.warn('3個以上連続する文字はマッチしませんでしたぜ(´・ω・｀)');
			return false;
		} 
	}
	
	/**
	 * 70行目までで一番大きな改行を台本の開始位置とみなす
	 * 
	 * @param String text
	 */
	this._searchScriptStartIndexByLf = function(text) {
		this.scriptStartIndex = this.firstMsgIndex;
		// 頭のテキストとみなす行数
		var headLineCount = 70;
		
		var headText = '';
		var lines = text.split('\n');
		for (var i in lines) {
			if (headLineCount <= i) {
				break;
			}
			headText += lines[i] + '\n';
		}
		
		var seqLfs = headText.match(/\n{2,}/gmi);
		mostLongLf = '';
		for (var i in seqLfs) {
			if (mostLongLf.length < seqLfs[i].length) {
				mostLongLf = seqLfs[i];
			}
		}
		
		var index = headText.lastIndexOf(mostLongLf);
		if (this.firstMsgIndex < index) {
			console.warn('最初の台詞を開始位置とみなします');
		} else {
			this.scriptStartIndex = index + mostLongLf.length;
		}
		console.warn('【台本の開始箇所】' + text.substr(this.scriptStartIndex, 20));
	}
	
	/**
	 * HTMLから台本のみを抜き出す
	 * 
	 * @param  String text
	 */
	this._pickupScript = function(text) {
		var script = text.substr(this.scriptStartIndex);
		// 最初の改行をカット
		script = script.replace(/^([\s\n]+)/m, '');
		// デバッグ用 不要
		var match = script.match(/\n.*(　| )+[↓]*\n/gmi);
		if (match !== null) {
			//console.warn(match);
		}
		// 改行の前の空白を削除
		script = script.replace(/(　| )+[↓]*\n/gmi, '\n');
		this.script = script;

	}
	
	/**
	 * 台本を整形
	 * 
	 * 行頭の空白を外す　等
	 * 
	 * @param String text
	 */
	this._formatScript = function(script) {
		// 最初の改行をカット
		var matches = script.match(/^(　| )+.*?\n/gm);
		
		//console.info(matches);
		script = script.replace(/^(　| )+/gm, '');
//console.warn(script);
		this.script = script;
	}
	
	/**
	 * 台詞、ナレーションを整形して配列に取得
	 * 
	 */
	this._pickupTextMessages = function(script) {
		// 改めて役名表記を拾う
		this._pickupCharSNamesFromScript(script);
//console.info(this.charSNames);	
		var splits = this._splitScriptByCharSName(script);
//console.info(splits);
		// 台詞間改行を数える
		this._countLfBtMsgs(splits)

			// 台詞を整形して配列に取得
	this._formatMessages(splits);

		return script;
	}
	
	/**
	 * 台本を分割して配列に取得
	 * 台詞前の役名で区切る
	 * 
	 * 例：
	 * 0 => 田中「〜〜」\n\nナレーション,
	 * 1 => 山田「〜〜」
	 */
	this._splitScriptByCharSName = function(script) {
		// 役名を判別しやすく文字列を置き換える 【 台詞 】を付ける
		var msgSplitChar = '【 台詞 】　';

		for (var i in this.charSNames) {
			var charSName = this.charSNames[i];
			charSName = charSName.replace('(', '.');
			charSName = charSName.replace(')', '.');
			charSName = charSName.replace('-', '.');
			var pattern = new RegExp('^' + charSName, 'gmi');
			script = script.replace(pattern, msgSplitChar + this.charSNames[i]);	
		}
		var splits = script.split(msgSplitChar);
//console.info(splits);

		var endIndex = splits.length - 1;
		splits[endIndex] = splits[endIndex].replace(/[\n]{2,}(\n|.)+$/, '');
		
		return splits;
	}
	
	/**
	 * キャラ名（台詞前の表記）を台本から抽出
	 * 同じ名前がなくても役名とみなす
	 * 
	 * @param String text
	 */
	this._pickupCharSNamesFromScript = function(text) {
		this.charSNames = [];
		var regPtn = new RegExp('^[^：:「『\n]*?' + this.delmChar, 'gmi');
		var strBeforeDelms = text.match(regPtn);
		if (strBeforeDelms === null) {
			return;
		}

		for (var i in strBeforeDelms) {
			var isPushed = false;
			var str = strBeforeDelms[i];
			
			// 配列に挿入済みか
			for (var j in this.charSNames) {
				if (this.charSNames[j] == str) {
					isPushed = true;
					break;
				}
			}
			if (isPushed === false) {
				this.charSNames.push(str);			
			}
		}

		console.info(this.charSNames);
	}
	
	/**
	 * 通常の台詞と台詞の間の改行の数を数える
	 * 
	 * @param Array messages
	 */
	this._countLfBtMsgs = function(messages) {
		// 最後の改行の種類 （\n、\n\n 等）
		var lfStrs = [];
		// 最後の改行の種類ごとの数 
		var lfCounts = {};		

		// この数の台詞数を対処に改行の数を数える
		var searchMsgCount = 20;
		// 
		for (var i in messages) {
			if (searchMsgCount <= i) {
				break;
			}
			// 最後の改行を取得
			var matches = messages[i].match(/[\n]+$/);
			if (matches === null) {
				continue;
			}
			var lfStr   = matches[0];
			var lfCount = lfStr.length;
			
			if (lfCounts[lfCount]) {
				lfCounts[lfCount] ++ ;
			} else {
				lfCounts[lfCount] = 1;
			}
	
			if (lfStrs.indexOf(lfStr) === -1) {
				lfStrs.push(lfStr);
			}
		}
		console.info(lfStrs);
		console.info(lfCounts);

		this._pickupMostManyEndLfStr(lfCounts);
	}
	
// 要コード改良　わかりやすく綺麗に	
	/**
	 * 一番多い台詞間改行を取得
	 * 2番めに多い台詞間改行を取得
	 * 
	 * @param Array lfCounts
	 */
	this._pickupMostManyEndLfStr = function(lfCounts) {
		var mostManyEndLf = '';
		var mostManyCount = 0;
		var secondManyEndLf = '';
		var secondManyCount = 0;
	
		for (var key in lfCounts) {
			if (mostManyCount < lfCounts[key]) {
				mostManyCount = lfCounts[key];
				mostManyEndLf = key;
			} 
			if (secondManyCount < lfCounts[key] && lfCounts[key] < mostManyCount) {				
				secondManyCount = lfCounts[key];
				secondManyEndLf = key;
			}
		}
//console.info(lfCounts);		
		var isSoMany = true;
		for (var key in lfCounts) {
			if (key == mostManyEndLf) {
				continue;
			}
			if (mostManyCount < lfCounts[key] * 4) {
				isSoMany = false;
			}
		}
	
		this.lfBtMsg == '';
		for (var i = 0; i < mostManyEndLf; i++) {
			this.lfBtMsg += '\n';
		}
		if (isSoMany == false) {
			console.warn('改行の数がバラバラな可能性あり');
			this.isLfBtMsgFixed = false;
			console.info('2番めに多いのは' + secondManyEndLf);	
			for (var i = 0; i < secondManyEndLf; i++) {
				this.lfBtMsgSecond += '\n';
			}
		}
		
		this.lfLengthBtMsg = mostManyEndLf;
	}
	
	/**
	 * 台詞を整形して取得
	 * 改行が続く場合は空の台詞を入れる
	 * 
	 * @param Array messages
	 */
	this._formatMessages = function(orgMessages) {
		// 台詞とナレーションを分けて配列に入れる
		var messages = this._splitMsgWithNaration(orgMessages);

		// 空文字が2個続く場合は省く
		for (var i in messages) {
			if (i != 0 && messages[i].length == 0 && messages[i - 1].length == 0 ) {
				continue;
			}
			// 「 が区切り文字の時は 」より後をカット
			if (this.delmChar == '「') {
				if (messages[i].match(/」[\n]+$/mi) === null) {
					messages[i] = messages[i].replace(/」/gmi, '\n');
				}
			}
			
			// 台詞とキャラ名を分割して連想配列に
			var textMessage = this._splitCharNameWithMessage(messages[i]);
			
			if (!textMessage.message) {
				continue;
			}
			
			// 台詞内で2行改行してる部分は2つに分ける
			var msg = textMessage.message;
			var splitMsgs = msg.split(/\n\n/gm);
			if (1 < splitMsgs.length) {
				console.info(splitMsgs);
				for (var j in splitMsgs) {
					var obj = {};
					obj.charName = textMessage.charName;
					obj.message = splitMsgs[j];
					console.info(obj);
					this.textMessages.push(obj);
				}
			} else {
				this.textMessages.push(textMessage);
			}
			
			//console.info(messages[i]);
			//console.info(textMessage);
		}
	}
	
	/**
	 * 台詞とナレーションが一緒になっている部分を分けて配列に入れる
	 * 
	 * @param Array msgWithNarations 台詞とナレーションの配列
	 * @return Array messages
	 */
	this._splitMsgWithNaration = function(msgWithNarations) {
		var messages = [];
		// 各メッセージを台詞間の改行で区切る
		for (var i in msgWithNarations) {
			var msg = msgWithNarations[i];
			
			// 台詞間の改行がバラバラな場合は 2番めに多い改行を1番目の改行に置き換え			
			if (this.isLfBtMsgFixed === false) {
				var regPtn = new RegExp(this.lfBtMsgSecond + '$', 'mi');
				msg = msg.replace(regPtn, this.lfBtMsg);				
			}
			
			// 台詞間の改行で分割。改行が\n * 1個の時は \n\nでsplitする
			if (this.lfBtMsg.length == 1) {
				var splits = msg.split('\n\n');
			} else {
				var splits = msg.split(this.lfBtMsg);
			}
			for (var j in splits) {
				if (j == splits.length - 1 && splits[j] == '') {
					continue;
				} 
				messages.push(splits[j]);
				/*
				// 台詞内で2行改行してる部分は2つに分ける
				//var splitMsgs = splits[j].split(/\n\n/gm);
				if (splitMsgs !== null) {
					for (var k in splitMsgs) {
						messages.push(splitMsgs[k]);
					}
				} else {
					messages.push(splits[j]);
				}*/
				
			}
		}
		
		return messages;
	}
	
	/**
	 * 
	 */
	this._splitCharNameWithMessage = function(message) {
		var textMessage = {};
		var splits = message.split(this.delmChar);

		if (2 == splits.length ) {
			textMessage.charName = splits[0];
			textMessage.message = splits[1];
			textMessage.isNaration = false;
		} else if (1 == splits.length) {
			textMessage.charName = null;
			textMessage.message = splits[0];
			textMessage.isNaration = true;
		} 
		
		return textMessage;
	}
}