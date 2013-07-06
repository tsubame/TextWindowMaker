/**
 * jQuery readyイベント
 */
$(function() {
	// テキストファイル内のオリジナルテキスト
	var orgScript = '';	
	// ファイルリーダー
	var fr = new FileReader();


	var messages = [];
	// テキストメッセージ
	// オブジェクトの配列
	//
	// charName:  
	// message:
	// isNaration:
	var textMessages = [];
	
	var messageActors;
	var messageNumber = 0;
	
	// 
	var nextMessages = [];
	// テキスト表示が終わったか
	var isEndShowText = true;

	/**
	 * ファイルを選択した時
	 */
	$("#files").change(function(evt) {
		var files = evt.target.files;
		var file = files[0];
		fr.readAsText(file);
	});
	
	/**
	 *　ファイル読み込み時
	 */
	fr.onload = function() {
		messageNumber = 0;
		orgScript = fr.result;
		// テキストエリアにテキストを描画
		// テキストエリアじゃなくdiv内の要素に変更
		$('#textArea').text(orgScript);
		
		var matches = orgScript.match(/<(html|xhtml|xml)/mi);
		if (matches !== null) {
			var scriptParser = new ScriptParser();
			textMessages = scriptParser.exec(orgScript);
		}
	};
	
	/**
	 * テキストウィンドウのクリック
	 */
	$("#textWindow").click(function() {
		if (isEndShowText === false) {
			return;
		}
		
		var message = textMessages[messageNumber].message;
		var charName = textMessages[messageNumber].charName;
		var isNaration = textMessages[messageNumber].isNaration;		

		var textMessage = textMessages[messageNumber];
		
//showText(message);
		isEndShowText = false;
showText(textMessage);
messageNumber ++;
showNextTexts(textMessages);

	
	}); 
	
	function showNextChar(string) {

		var text = string.substr(0, charIndex + 1);
		$("#textWindow").html(text);
		
		if (text.length == string.length) {

			clearInterval(timer);
		}
	}
	
	/**
	 *
	 */
	function showText(textMessage) {

		var text = '';
		if (textMessage.message) {
			text = textMessage.message;
		}

		var charName = '';
		if (textMessage.charName) {
			charName = textMessage.charName;
		}
		var isNaration = textMessage.isNaration;	
		
		var charIndex = 8;
		var timer = setInterval(function() {
			//var message = text.substr(0, charIndex + 1);
			var windowText = text.substr(0, charIndex + 1);
			$("div#charName").html(charName);
			$("div#message").html(windowText);
			charIndex ++ ;
			if (windowText.length < charIndex) {
				isEndShowText = true;
				clearInterval(timer);
			}
		}, 10);	
	}
	
	function showNextTexts(textMessages) {
		nextMessages = textMessages.slice(messageNumber);
		var nextTexts = '';
		for (var i in nextMessages) {
			
			if (nextMessages[i].isNaration === true) {
				var nextText = nextMessages[i].message;
			} else {
				var nextText = nextMessages[i].charName + '\n「' + nextMessages[i].message;
			}
			
			nextTexts += nextText;
			nextTexts += '<hr>';
		}
		$('#nextTexts').html(nextTexts);
	}
});

/**
 * スリープ
 */
function showSample(){ 
	console.info('text');
} 

/**
 * 改行コードを変換
 * \nに統一
 */
function convertCRtoLF(str) {
	// 改行コードを変換
	str = str.replace(/\r\n/gm, "\n");	
	str = str.replace(/\r/gm, "\n");	
	str = str.replace(/<(br|BR)[\s|\/]*>/gm, "\n");
	
	return str;
}




function sample() {
	console.info('sample.');
}

/**
 * セリフ抜き出しロジック
 */
function logic() {
	// テキストファイルを文字列に読み込む
	
	// 行数を数える

	// セリフの区切り文字（「、：、:、テーブルなど）は何か調べる
	
	// 台本の開始場所を調べる
	
	// キャラ名を取得
		// 区切り文字の手前の名前
	
	// 区切り文字に一致する部分を取得
		// "「" の場合は "」"まで
		// "："の場合は？ 1行　もしくは

}

/**
 * 台本をパース
 * ・役名を抽出
 * ・台詞と地の文を抽出
 */
function parseScript() {
	var script = '';
	// HTMLはBODYだけ抜き出す
	script = pickupBodyFromHtml(orgScript);
	// 改行コードの変換
	//script = convertCRtoLF(script);
	// テーブルタグを抜き出す
	pickupLinesFromTable(script);
	
	
	// 行数を数える
	var returnCount = countScriptLines(script);
	console.info(returnCount + '行');
	// セリフの区切り文字（「、：、:、テーブルなど）は何か調べる
	getDelimter(script);
	
	// 台本の開始場所を調べる
	getScriptStartLine(script);	
	/**/
}

/**
 * メモ
 */
// 役名は行頭から"「"、"："の前までの部分
// SE〜と書いてあるところはどうする？
// 台本の始まり部分をどう解釈するか？
// ・100行目までの1番大きな改行
// HTMLはBODY内だけ抜き出す
// テーブル内のセルが「〜」のときはセリフ付きとみなしていいかも


// 要改善
/**
 * テキスト内の改行の数を数える
 *
 * @params String text
 */
function countScriptLines(text) {
	var count = 0;
	var returns = text.match(/\n/gm);
	if (returns !== null) {
		count = returns.length;
	}
	
	return count;
}



/**
 * HTMLのBODYだけ抜き出す
 */
function pickupBodyFromHtml(str) {
	var matches = str.match(/<body[^>]*>/mi);
	if (matches !== null) {
		console.info('htmlです');
		var splits = str.split(matches[0]);
		str = splits[1];
		
		// scriptsをカット
		str = str.replace(/<script[^>]+>[^<]+<\/script>/gmi, '');
		str = str.replace(/<\/body>/mi, '');
		str = str.replace(/<\/html>/mi, '');
	}
	
	return str;
}

/**
 * テーブル内の台詞を抜き出す
 *
 * @var String text
 */
function pickupLinesFromTable(text) {
	// テーブルタグを抜き出す
	var tables = text.match(/<table(\n|.)+?<\/table[^>]*>/gmi);
	if (tables == null) {
		console.info('tableタグ無し');
		return;
	}
	// テーブルの件数ループ
	for (var i in tables) {
		// セリフ付きのテーブルかどうか
		var isCharLineTable = false;
		// 最初の30セルを取り出す
		var allTds = tables[i].match(/<(td|th)(\n|.)+?<\/(td|th)>/gmi);
		var tds = [];
		if (30 <= allTds.length) {
			tds = allTds.slice(0, 30);
		} else {
			tds = allTds;
		}

		// セル内のテキストを抜き出す
		var cellStrs = [];
		// セルの件数ループ
		for (var j in tds) {
			// タグを消去
			var str = tds[j].replace(/<[^>]+>/gmi, ''); 		
			// 数字、空白、性別のセルはスキップ				
			var matches = str.match(/^([\d]|[\s]|　|[\s]*(♂|男|♀|女)[\s]*)+?$/mi);

			if (matches !== null) {
				continue;
			}
			cellStrs.push(str);
		}

		// セル内のテキストの件数ループ
		for (j in cellStrs) {
			for (var k in cellStrs) {
				if (j == k) {
					continue;
				}
				// 同じセルが有るか調べる　同じセルがあればセリフ付きとみなす
				if (cellStrs[j] == cellStrs[k]) {
					//put(cellStrs[j]);
					isCharLineTable = true;
				}
			}
		}
		
		if (isCharLineTable === true) {
			put(cellStrs);
		}
	}	
}
 



/**
 * 
 */
/**
 * 区切り文字を取得
 *
 * @params String str
 */
function getDelimter(str) {
	// 区切り文字のリスト
	var delms = ['「', '：', ':'];
	var delm = '';
	// それぞれの区切り文字の出現回数
	var delmCounts = [];
	// 区切り文字とみなす最小の出現数
	var minRegDelmCount = 10;
	
	for (var i = 0; i < delms.length; i++) {
		var count = countWord(str, delms[i]);
		//var matches = str.match(/\r/gm);
		
		delmCounts[i] = count;
		console.info(delms[i] + ' の出現回数：' + count);
	}
	
	var mostCount = 0;
	// 一番多い区切り文字を取得
	for (var i = 0; i < delms.length; i++) {
		if (mostCount < delmCounts[i]) {
			mostCount = delmCounts[i];
			delm = delms[i];
		}
	}
	
	if (mostCount < minRegDelmCount) {
		console.warn('区切り文字でない可能性があります！');
	}

	console.info('区切り文字は' + delm);
}

/**
 * 台本の開始行を調べる
 *
 *  最初の50行ぐらいに絞ったほうがいい？
 */
function getScriptStartLine(str) {
	// 最初の50行を取り出す
	var maxLineCount = 50;
	// 正規表現で改行付きの文章検索
	var lines = str.split("\n");
	// 50番目、もしくは最後の行を取得
	if (lines.length < maxLineCount) {
		maxLineCount = lines.length - 1;
	}
	
	var headScript = '';
	
	for (var j in lines) {				
		if (maxLineCount <= j) {
			break;
		}		
		headScript += lines[j] + '\n';	
	}
	console.info(headScript);

	// 連続する改行コードを検索
	var matches = headScript.match(/[\n]+/gm);	
	// 一番改行が連続している箇所を取得
	var longestCr = '';
	for (var i in matches) {				
		if (longestCr.length < matches[i].length) {
			longestCr = matches[i];
		}
	}

	//console.info(longestCr.length);
	// その箇所の後を台本の開始箇所とみなす
	var scriptStartCount = str.indexOf(longestCr) + longestCr.length;
	//console.info(scriptStartCount);
	var script = str.substr(scriptStartCount);
	console.info(script);
}



/**
 * 台本の分割
 */
function splitScript(str) {
	// セリフの区切り文字を取得
	var delm = getDelimter(str);
	// 台詞数を取得
}

/**
 * 台詞を抜き出す
 */
function pickupLines() {
	
}

/**
 * 役名を抜き出す
 */
function pickupActorNames() {
	
}

/**
 * 区切り文字を取得
 *
 * @params String str
 */
/*
function getDelimter(str) {
	// 外に出す 定数？
	var delms = ['「', '：', ':'];
	
	var delm = '';
	for (var i = 0; i < delms.length; i++) {
		//var delm = '「';
		var count = countWord(str, delms[i]);
		console.info(delms[i] + ' の出現回数：' + count);

		// 10は改善する必要あり
		if (10 < count) {
			delm = delms[i];
			
			break;
		}
	}

	lines = str.match(/\n/g);	
	console.info(lines.length + 1 + '行');
}
*/
/**
 * 文字の出現回数をカウント
 */
function countWord(str, word) {
	var count = 0;	
	var pos = str.indexOf(word);
	
	while (pos != -1) {
		count++;
		pos = str.indexOf(word, pos + 1);
	}
	
	return count;
}

/**
 * 「〜」のセリフを抜き出し
 * 台詞の前の役名を抜き出し
 *
 * @param String text
 */
function pickupActorSpeech(text) {
	// セリフ「〜〜」の部分を抜き出す
	speeches = text.match(/「[^」]*」[\s|　]*$/gm);
	// セリフの前の役名を抜き出す
	//actors = text.match(/^[^\n「]*「/gm);
	actors = text.match(/^[^\n「]*「[^」]*」[\s|　]*$/gm);
	
	if (speeches == null) {
		console.info('セリフの出現回数： 0');
		return;
	} 
	// 役名の数ループ
	for (var i = 0; i < actors.length; i++) {
		// "「"以降を取り除く
		actors[i] = actors[i].replace(/「[^」]*」/gm, '');
		// 最初と最後の空白を取り除く
		actors[i] = actors[i].replace(/^[\s]*|[\s]*$/gm, '');
	}	
		
	console.info('セリフの出現回数：' + speeches.length);
	console.info('役名の出現回数：' + actors.length);
	console.info(speeches);
	console.info(actors);
	messageActors = actors;
	messages = speeches;
}

/**
 * Firebugコンソールにアウトプット
 */
function put(str) {
	console.info(str);
}