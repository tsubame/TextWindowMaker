/**
 * HTMLファイルの台本を読み込むモジュール
 */
function HtmlParser(orgHtml, delm) {

	// 区切りに使う罫線
	this.DIVIDE_LINE = "･･････････････････････････････････････････"
	
	// 元のHTML
	this.orgHtml = orgHtml;
	// HTML内のBody要素をテキスト化したもの
	this.text = null;
	// 台詞の区切り文字
	this.delmChar = delm;
	// 上記の区切り文字の出現回数
	this.delmCharCount = 0;

	// 台詞の数
	this.charMsgCount = 0;
	// 最初の台詞の文字のインデックス（テキスト内）
	this.firstMsgPlace = 1000000;
	// 台本の開始箇所のインデックス（テキスト内）
	this.scriptStartPlace = null;
	// 最後の台詞の直後の文字のインデックス
	this.lastMsgPlace = 1000000;
	// 台詞間の改行の数
	this.lfLengthBtMsg = 0;
	// 台詞間の改行
	this.lfBtMsg = '';
	
	// 台詞、ナレーション
	this.messages = [];
	// 台詞に対応するキャラ名
	this.charSNames = [];
	// キャラ名＋台詞
	this.texts = [];
	// テーブルの前にあるテキスト
	this.preTableTexts = [];
	
	// 改名案
	// 台詞 ＋ ナレ: messages
	// 台詞 : voiceMessages or messages
	// 役名 ＋ 台詞 ： texts
	// 役名の表記 : charSNames
	// 役名の表記＋区切り文字 : charSNamesWithDelms
		
	/**
	 * 処理実行
	 * 
	 * 台本部分のテキストを返す
	 * 
	 * @return String script
	 */
	this.exec = function() {	
		// bodyタグ内を取得
		var html = this._pickupBody(this.orgHtml);
		var text = null;
		// preタグが有るか？
		var hasPreTag = this._hasPreTag(html);
		if (hasPreTag === true) {
			console.info('<pre>タグ使用');
			text = html.replace(/<(\/)*pre>/gmi, '');
		} else {
			// HTMLをテキストに変換
			text = this._convertHtmlToText(html);
			this.text = text;
		}
		
//console.info(text);
		// 台詞の開始位置を検索
		this._searchFirstMsgPlace(text);
		// 
		this._searchScriptStartPoint(text);		
		// 台本部分を抜き出す
		var script = this._pickupScript(text);
		
		return script;
		// 台詞、ナレーションを抜き出す
		//this._pickupMessage(script);

		/*
		// テーブル間のテキストを取得
		this.preTableTexts = this._searchTextBetweenTable(text);
		// テーブルから台詞抽出
		this._pickupLinesFromTable(text);
		
		// セリフ付きテーブルがない場合
		if (this.texts.length < 1) {
			// 台詞間の改行方法を調べる
			this._searchReturnTag(text);
			// テーブル以外から台詞抽出			
			this._pickupLinesFromNonTable(text);
		}
		
		for (var i in this.texts) {
			console.info(this.texts[i]);
		}
		*/
		//return this.texts;
	}

	/**
	 * bodyタグ内のHTMLを抜き出す
	 * bodyタグとscriptタグ、headタグ、rdfタグは削除
	 *
	 * @param String html
	 * @param String bodyHtml
	 */
	this._pickupBody = function(html) {	
		var bodyHtml = html;
		matches = html.match(/<body(\n|.)+?<\/body>/);
		if (matches !== null) {
			bodyHtml = matches[0];
		} else {
			console.warn('bodyタグがありません');
		}
		
		// 各タグを削除
		bodyHtml = bodyHtml.replace(/<script(.|\n)+?\/script>/gmi, '');
		bodyHtml = bodyHtml.replace(/(<body([^>]|\n)*?>)/gmi, '');
		bodyHtml = bodyHtml.replace(/<\/body(\n|.)+/gmi, '');
		bodyHtml = bodyHtml.replace(/^(\n|.)+<\/head>/gmi, '');
		bodyHtml = bodyHtml.replace(/<rdf(\n|.)+<\/rdf[^>]*>/gmi, '');

		return bodyHtml;
	}
	
	/**
	 * preタグがあるか調べる
	 * 
	 * @param  String html
	 * @return Bool
	 */
	this._hasPreTag = function(html) {
		var match = html.match(/<pre/mi);
		if (match !== null) {
			return true;
		}
		
		return false;
	}
	
	/**
	 * HTMLをテキスト形式の文章に変換
	 * 
	 * ・改行タグを\nに
	 * ・HRを
	 * ・タグを削除
	 * ・HTMLメタ文字の変換
	 * 
	 * @param  String html
	 * @return String text
	 */
	this._convertHtmlToText = function(html) {
		var text = html;
		text = this._convertTagsToLF(text);
		text = this._convertMetaChar(text);
		text = this._removeTags(text);
		
		return text;
	}
	
	/**
	 * 改行タグを\nに変換
	 * 
	 * <div> → \n
	 * <p> → \n
	 * <br /> → \n
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._convertTagsToLF = function(html) {
		var cHtml = html;
// 元の改行コードを外す
cHtml = cHtml.replace(/\n/gmi, '');
		
var lfChar = '\n';
//var lfChar = '\n';

		cHtml = cHtml.replace(/[\s]*?<br[^>]*?>/gmi, lfChar);
		cHtml = cHtml.replace(/<p>/gmi, '');
		cHtml = cHtml.replace(/<p[\s]+[^>]*?>/gmi, '');
		cHtml = cHtml.replace(/<\/p[^>]*?>/gmi, lfChar);
		cHtml = cHtml.replace(/<div>/gmi, '');
		cHtml = cHtml.replace(/<div[\s]+[^>]*?>/gmi, '');
		cHtml = cHtml.replace(/(　| )*<\/div[^>]*?>/gmi,  lfChar);

		return cHtml;
	}
	
	/**
	 * HTMLメタ文字の変換
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._convertMetaChar = function(html) {
		var cHtml = html;
		cHtml = cHtml.replace(/&amp;/g, '&');
		cHtml = cHtml.replace(/&quot;/g, '"');
		cHtml = cHtml.replace(/&#039;/g, "'");
		cHtml = cHtml.replace(/&lt;/g, '<');
		cHtml = cHtml.replace(/&gt;/g, '>');				
		cHtml = cHtml.replace(/&quot;/g, '"');
		cHtml = cHtml.replace(/&hellip;/g, '…');
		cHtml = cHtml.replace(/&rarr;/g, '→');
		cHtml = cHtml.replace(/&#12316;/gmi, '〜');
		cHtml = cHtml.replace(/&nbsp;/gmi, ' ');
		// 上記以外
		cHtml = cHtml.replace(/&[^;]+?;/gmi, '');
		
		return cHtml;
	}
	
	/**
	 * HTMLタグを削除
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._removeTags = function(html) {
		var cHtml = html;
		cHtml = cHtml.replace(/<!\-\-[^\-]*?\-\->/gmi, '');
		// ulタグ
		cHtml = cHtml.replace(/<ul(.|\n)+?\/ul>/gmi, '');
		// liタグ
		cHtml = cHtml.replace(/<li(.|\n)+?\/li>/gmi, '');
		// h1~6タグ
		cHtml = cHtml.replace(/<h[1-6](.|\n)+?\/h[1-6]>/gmi, '');	
		// formタグ
		cHtml = cHtml.replace(/<form(.|\n)+?\/form>/gmi, '');	
		// aタグ
		cHtml = cHtml.replace(/<a[\s](.|\n)+?\/a>/gmi, '');	
		// subタグ
		cHtml = cHtml.replace(/<sub(.|\n)+?\/sub>/gmi, '');	
		// hrを置き換え
		cHtml = cHtml.replace(/<hr[^>]*>/gmi, this.DIVIDE_LINE);	
		// img
		cHtml = cHtml.replace(/<img[^>]*>/gmi, '');	
		// その他のタグ
// 不要？
		cHtml = cHtml.replace(/>>/gmi, '】');
cHtml = cHtml.replace(/<[^>]+?>/gmi, '');	
		// 最初の空白を削除
		cHtml = cHtml.replace(/^[\s\n]+/m, '');
		cHtml = cHtml.replace(/^[ ]+/gmi, '');
		
		return cHtml;
	}
	
	
	/**
	 * 最初の台詞の位置を取得
	 * 
	 * @param String text
	 */
	this._searchFirstMsgPlace = function(text) {
		// キャラ名表記を取得
		this._pickupCharSNames(text);
		var firstMsgPlace = 100000;
		var lastMsgPlace = 0;
		
		for (var i in this.charSNames) {
			var regPtn = new RegExp('^' + this.charSNames[i] + '[^♂♀：:]*\n', 'mi');
			var charFirstMsg = text.match(regPtn);
			if (charFirstMsg === null) {
				continue;
			}
			
			var place = text.indexOf(charFirstMsg);
			if (place < firstMsgPlace) {
				firstMsgPlace = place;
			}
			
			var lastPlace = text.lastIndexOf(this.charSNames[i]);
			if (lastMsgPlace < lastPlace) {
				lastMsgPlace = lastPlace;
			}
		}
		var str = text.substr(firstMsgPlace, 20);
		console.info('【最初の台詞】\n' + str);
	

		var bottomText = text.substr(lastMsgPlace, 180);
		//console.info('【最後の台詞】\n' + bottomText);
		var bottomMsg = bottomText.match(/[^\n]\n\n/mi);
		var bottomPlace = bottomText.indexOf(bottomMsg);
		var lastMsg = bottomText.substr(0, bottomPlace + 1);
		
		console.info('【最後の台詞】\n' + lastMsg);
		
		this.firstMsgPlace = firstMsgPlace;
		this.lastMsgPlace = text.lastIndexOf(lastMsg) + lastMsg.length;
	}
	
	/**
	 * キャラ名（台詞前の表記）を抽出
	 * 同じ名前の表記が2つ以上あれば役名とみなす
	 * 
	 * @param String text
	 */
	this._pickupCharSNames = function(text) {
		var regPtn = new RegExp('^[^：:「『\n]*?' + this.delmChar, 'gmi');
		var strBeforeDelms = text.match(regPtn);
		if (strBeforeDelms === null) {
			return;
		}

		for (var i in strBeforeDelms) {
			var hasSameName = false;
			var isPushed    = false;
			var str = strBeforeDelms[i];
			
			if (10 < str.length) { // 10文字以上ならスキップ
				continue;
			} else if (str.match(/♀/) || str.match(/♂/)) { // ♀、♂が含まれた役名は役名紹介の可能性が高いのでスキップ
				continue;
			}

			// 同じ名前が有るか調べる
			for (var j in strBeforeDelms) {
				if (i == j) {
					continue;
				}
				if (str == strBeforeDelms[j]) {
					hasSameName = true;
				}
			}
			if (hasSameName === false) {
				continue;
			}
			
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
			var isPushed    = false;
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
	 * HTMLから台本のみを抜き出す
	 * 
	 * @param String html
	 * @return String script
	 */
	this._pickupScript = function(text) {
		var script = text.substr(this.scriptStartPlace);
		// 最初の改行をカット
		script = script.replace(/^([\s\n]+)/m, '');
//console.info(script);
	
	var match = script.match(/\n.*(　| )+[↓]*\n/gmi);
	if (match !== null) {
		console.warn(match);
	}
		script = script.replace(/(　| )+[↓]*\n/gmi, '\n');
		// 改めて役名表記を拾う
		this._pickupCharSNamesFromScript(script);
//console.info(this.charSNames);	
		var msgSplitChar = '【 台詞 】　';

		// 役名表記を判別しやすく置き換え 【を付ける
		for (var i in this.charSNames) {
			var charSName = this.charSNames[i];
			charSName = charSName.replace('(', '.');
			charSName = charSName.replace(')', '.');
			charSName = charSName.replace('-', '.');
			var pattern = new RegExp('^' + charSName, 'gmi');
			script = script.replace(pattern, msgSplitChar + this.charSNames[i]);	
		}
//console.info(script);

// 台詞を抽出
// メソッド化
		var splits = script.split(msgSplitChar);

		var messages = [];
		
		for (var i in splits) {
			if (i == splits.length - 1) {
				splits[i] = splits[i].replace(/[\n]{2,}(\n|.)+$/, '');
				// 最後の空白を削除
				//splits[i] = splits[i].replace(/[\s]+\n/, '\n');

			}
			
			messages.push(splits[i]);
			if (splits[i].match(/[\n]{2,}$/)) {
				messages.push(null);
			}
			//console.info(splits[i]);
		}
// メソッド化		
		// 台詞間改行を数える

		var endLfs = [];		
var endLfCounts = {};		
		
		for (var i in splits) {
			//console.info(messages[i]);
			var endLf = null;
var endLfMatches = splits[i].match(/[\n]+$/);

			if (endLfMatches !== null) {
				endLf = endLfMatches[0];
				var endLfCount = endLf.length;
				if (endLfCounts[endLfCount]) {
					endLfCounts[endLfCount] ++ ;
				} else {
					endLfCounts[endLfCount] = 1;
				}
			}

			var isPushed = false;
			for (var j in endLfs) {
				if (endLf == endLfs[j]) {
					isPushed = true;
				}
			}
			if (isPushed === false) {
				endLfs.push(endLf);
			}

			if (20 <= i) {
				break;
			}
		}
		console.info(endLfs);
		console.info(endLfCounts);

var mostManyEndLf = '';
var mostManyCount = 0;
var secondManyCount = 0;

		for (var key in endLfCounts) {
			if (mostManyCount < endLfCounts[key]) {
				mostManyCount = endLfCounts[key];
				mostManyEndLf = key;
			}
		}
		
		var isSoMany = true;
		for (var key in endLfCounts) {
			if (key == mostManyEndLf) {
				continue;
			}
			if (mostManyCount < endLfCounts[key] * 4) {
				isSoMany = false;
			}
		}

console.info(mostManyEndLf);
this.lfBtMsg == '';
for (var i = 0; i < mostManyEndLf; i++) {
	this.lfBtMsg += '\n';
}
//console.info(this.lfBtMsg.length);
console.info(mostManyCount);
if (isSoMany == false) {
	console.warn('改行の数がバラバラな可能性あり');
}
this.lfLengthBtMsg = mostManyEndLf;

		// 台詞を整形して配列に取得
		this._formatMessages(splits);

		return script;
	}
	
	/**
	 * 台詞を整形して取得
	 * 改行が続く場合は空の台詞を入れる
	 * 
	 * @param Array messages
	 */
	this._formatMessages = function(orgMessages) {
		var messages = [];
		// chapter間の改行文字
		var lfBtChapter = this.lfBtMsg + '\n';
//console.info('chapter間の改行' + lfBtChapter + 'ここまで');		
		// 
		for (var i in orgMessages) {
			var msg = orgMessages[i];
			
			// 台詞間改行が\n * 1個の時は \n\nでsplitする
			if (this.lfBtMsg.length = 1) {
				var splits = msg.split('\n\n');
			} else {
				var splits = msg.split(this.lfBtMsg);
			}

			for (var j in splits) {
				if (j == splits.length - 1 && splits[j] == '') {
					continue;
				} 
				messages.push(splits[j]);
			}
		}
		
		
		
		// 空文字が2個続く場合は省く
		for (var i in messages) {
			//console.info(messages[i]);
			if (i != 0 && messages[i].length == 0 && messages[i - 1].length == 0 ) {
				continue;
			}
			// 」が区切り文字の時
			if (this.delmChar == '「') {
				if (messages[i].match(/」[\n]+$/mi) === null) {
					//console.warn(messages[i]);
					messages[i] = messages[i].replace(/」/gmi, '」\n');
				}
				//var splt = msg.split('」');
				
			}
			
			this.texts .push(messages[i]);
			console.info(messages[i]);
		}
	}
	
	/**
	 * 台本の開始箇所を調べる
	 * 
	 * @param String text
	 * @return Integer startCount (台本の何文字目か)
	 */
	this._searchScriptStartPoint = function(text) {
		
		var headText = text.substr(0, this.firstMsgPlace);
//console.info(headText);		
		var lineStr = null;
		// 線（━━、＿＿、）、同じ文字の繰り返しを取得		
		var matches = headText.match(/([^\w\s　・….!！（）\(\)ぁ-んァ-ン])\1\1.*?\n/gmi);
		// 一番最後の線の場所
		var lastLinePlace = 0;
		
		if (matches !== null) {
			for (var i in matches) {
				var place = headText.lastIndexOf(matches[i]);
				if (lastLinePlace < place) {
					lastLinePlace = place;
					lineStr = matches[i];
				}
			}
		} else {
			console.info('3個以上連続する文字はマッチしませんでしたぜ(´・ω・｀)');
		} 
		
		if (lineStr !== null) {
			this.scriptStartPlace = lastLinePlace + lineStr.length;
			console.info('台本の開始箇所を示す文字列は ' + lineStr);
			console.info('【台本の開始箇所】' + text.substr(this.scriptStartPlace, 20));
		} else {
			this.scriptStartPlace = this.firstMsgPlace;
			// メソッド化
			// 70行目までで一番大きな改行を最初とみなす？
			headText = '';
			var lines = text.split('\n');
			for (var i in lines) {
				if (70 <= i) {
					break;
				}
				headText += lines[i] + '\n';
			}
			
			//console.info(headText);
			var seqLfs = headText.match(/\n{2,}/gmi);
			mostLongLf = '';
			for (var i in seqLfs) {
				if (mostLongLf.length < seqLfs[i].length) {
					mostLongLf = seqLfs[i];
				}
			}
			
			var place = headText.lastIndexOf(mostLongLf);
			if (this.firstMsgPlace < place) {
				console.warn('最初の台詞を開始位置とみなします');
			} else {
				this.scriptStartPlace = place + mostLongLf.length;
			}
			console.info('【台本の開始箇所】' + text.substr(this.scriptStartPlace, 20));
		}
	}
	
	/**
	 * 登場人物紹介をカット
	 * 【登場人物紹介】に置き換える
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._replaceCharInrto = function(html) {
		var cHtml = html;
		cHtml = cHtml.replace(/^[^\n:：]*?[♂♀][^\n:：]*?[:：].*$/gmi, ' 【登場人物紹介】');
		cHtml = cHtml.replace(/^[^\n:：]*?[:：]*?[♂♀][:：]*?$/gmi, ' 【登場人物紹介】');
		cHtml = cHtml.replace(/^[^\n:：]*?[^\n:：]*?[:：][ ]*?\n/gmi, ' 【登場人物紹介】\n');
		
		return cHtml;
	}
	
	
	
	/**
	 * テーブル以外からテキストを抽出
	 * 
	 * @param String bodyHtml
	 */
	this._pickupLinesFromNonTable = function(text) {
		// 区切り文字を取得
		
		// 各改行タグ（br、p、div、pre）の数を数える
		
		// 台詞前のキャラ表記を取得
		// 区切り文字付きの表記とキャラ名のみと両方取得した方がいい？
// charSNamesは外に出す
// 表記どおりの配列も作成し外に出す
		var charSNames = this._pickupCharaNames(text);
		// 台詞の数を数える
		
		// 台本の開始箇所を調べる
		this._searchScriptStartPoint(text);
		
		// 台詞間の改行をどうやっているか判別
			// pre ＋ \n、br、p、div	
			// 区切り文字と改行方法によってテキストの抽出法が変わる
		var brCount = 0;
		var divCount = 0;
		
		for (var i in charSNames) {
			//var reg = new RegExp('^(<|>|\\w|\\s)*?' + charSNames[i] + '([\\s]|　)*?' + this.delmChar + '.*', 'gmi');
			var reg = new RegExp('[<\\w\\s>]*' + charSNames[i] + '([\\s]|　)*?' + this.delmChar + '.*?<[^>]+?>', 'gmi');
			var matches = text.match(reg);
//console.info(matches);
			if (matches === null) {
				continue;
			}
			this.charMsgCount += matches.length;
			
			for (var j in matches) {
				var brMatch = matches[j].match(/<br[\/\s]*>[\s]*$/mi);
				if (brMatch !== null) {
					brCount++;
				}
				var divMatch = matches[j].match(/<\/div[\s]*>[\s]*$/mi);
				if (divMatch !== null) {
					divCount++;
				}
			}
		}
		
		if (5 < brCount) {
			console.info('改行方法は<br />');
		} else if (5 < divCount) {
			console.info('改行方法は<div>');	
		}
		
		console.info('台詞数：' + this.charMsgCount);
	}
	
	/**
	 * 台詞の数を数える
	 * 
	 * @param String text
	 * @param Array charShortNames
	 */
	this._countCharMessages = function(text, charShortNames) {
		
	}
	

	
	/**
	 *　改行手段を調べる
	 */ 
	this._searchReturnTag = function(text) {
		// <pre>タグが有るか
		var matches = text.match(/<pre[^>]*?>/mi);
		if (matches !== null) {
			console.info('<pre>あり');
		} 
		var brCount = 0;
		// <br />の数を数える
		var matches = text.match(/<br[^>]*?>/gmi);
		if (matches !== null) {
			brCount = matches.length;
			console.info('<br />の数:' + brCount);
		}

		var pCount = 0;
		// <br />の数を数える
		var matches = text.match(/(<p[\s]+[^>]*?>|<p>)/gmi);		
		if (matches !== null) {
			pCount = matches.length;
			console.info('<p>の数:' + pCount);
			if (this.delmCharCount < pCount) {
				console.info('台詞間の改行方法は<p>');		
			} else if (this.delmCharCount < brCount) {
				console.info('台詞間の改行方法は<br />');		
			}
		}
		

	}
	
	/**
	 * メモ
	 *
	 * 台詞の記述方法
	 * 区切り文字は A.「」 B.：
	 * 改行方法は 1.<br /> 2. <p> 3.<div> 4.<pre> + \n
	   
	   
	   
	   ・<br />のときは次の台詞との間に<br >がいくつあるか調べる
	 *
	   A-1
	   田中「〜〜〜。<br />
	   		〜〜〜。」<br /><br />
	   B-1
	   田中：〜〜〜。<br />
	   		〜〜〜。<br /><br />
	   		
	   A-2
	   <p>田中「〜〜〜。<br />
	   		〜〜〜。」<br /></p>

	   A-3
	   <div>田中「〜〜〜。<br />
	   		〜〜〜。」<br /></div>
	 */
	

	


	
	/**
	 * テーブル内の台詞を抜き出す
	 *
	 * @param String text
	 */
	this._pickupLinesFromTable = function(text) {
		// テーブルタグを抜き出す
 		var tables = _searchTableTag(text);
 		if (tables === null) {
 			return;
 		}
		// テーブルの件数ループ
		for (var i in tables) {
			// セリフ付きのテーブルかどうか
			var isMessageTable = this._isMessageTable(tables[i]);
			if (isMessageTable === true) {
				// テーブルの前のテキストを表示
				console.warn(this.preTableTexts[i]);
				// セルを拾って連結
				var messages = this._searchMessageFromTable(tables[i]);
				for (var j in messages) {
					console.info(messages[j]);
				}

				this.texts.push('　' + this.preTableTexts[i]);				
				this.texts = this.texts.concat(messages);
				this.texts.push('');
			}
			
			console.warn();
		}	
	}
	
	/**
	 * テーブルタグを抜き出す
	 *
	 * @param  String text
	 * @return String[] tables ない場合はnull
	 */
	this._searchTableTag = function(text) {
		var tables = text.match(/<table(\n|.)+?<\/table[^>]*>/gmi);
		if (tables == null) {
			console.info('tableタグ無し');
			return null;
		} else {
			return tables;
		}
	}
	
	/**
	 * セリフ付きのテーブルか調べる
	 *
	 * @param  String table
	 * @return bool ない場合はfalse
	 */
	this._isMessageTable = function(table) {	
		// 比較用に抜き出すセルの数
		var compareCellCount = 30;
		// 最初の数十セルを取り出す
		var allCells = table.match(/<(td|th)(\n|.)+?<\/(td|th)>/gmi);
		var headCells = allCells;
		if (compareCellCount <= allCells.length) {
			headCells = allCells.slice(0, compareCellCount);
		}

		// 区切り文字で調べる
		if (this.delmChar === '「') {
			var matches = table.match(/「(\n|.)+?」/gmi);
			if (matches === null) {
				return false;
			}
		}

		// セル内のテキストのみを抜き出す。数字、空白、性別のセルはスキップ	
		var cellTexts = [];
		for (var j in headCells) {
			var str = headCells[j].replace(/<[^>]+>/gmi, '');
			var matches = str.match(/^([\d]|[\s]*|　|[\s]*(♂|男|♀|女)[\s]*)+?$/i);
			if (matches == null) {
				cellTexts.push(str);
			}
		}
		// 同じテキストのセルが2つ以上有るか調べる　同じセルがあればセリフ付きとみなす
		for (var j in cellTexts) {
			for (var k in cellTexts) {
				if (j == k) {
					continue;
				}
				if (cellTexts[j] == cellTexts[k]) {
					return true;
				}
			}
		}
		
		return false;
	} 
	
	/**
	 * テーブル内のセルを拾って役名と台詞を連結して返す
	 *
	 * @param String table
	 * @return Array messages
	 */
	this._searchMessageFromTable = function(table) {
		var messages = [];
	
		// セルを取り出す
		var allCells = table.match(/<(td|th)(\n|.)+?<\/(td|th)>/gmi);
		//console.info(allCells);	
		var cellTexts = [];
		for (var j in allCells) {
			var str = allCells[j].replace(/<[^>]+?>/gmi, ''); 
		//console.info(str);	
			var matches = str.match(/^([\d]|[\s]*|[　]*|[\s]*(♂|男|♀|女)[\s]*)+?$/gi);
			if (matches === null) {
				cellTexts.push(str);
			} 
		}
		//console.info(cellTexts);
		
		for (var i = 0; i < cellTexts.length; i += 2) {
			if (cellTexts.length <= i + 1) {
				messages.push(cellTexts[i]);
			} else {
				messages.push(cellTexts[i] + '<br />' + cellTexts[i + 1]);	
				//messages.push(cellTexts[i] + ' ' + cellTexts[i + 1]);				
				this.charSNames.push(cellTexts[i]);
				this.messages.push(cellTexts[i] + 1);
			}
		}
		
		for (var i in messages) {
			//console.info(messages[i]);	
		}
		
		return messages;
	}
	
	/**
	 * テーブルとテーブルの間の文章を取り出す
	 *
	 * @param String html
	 * @return 
	 */
	this._searchTextBetweenTable = function(html) {
		var text = html.replace(/<table(\n|.)+?<\/table>/gmi, '[--]');
		//var text = text.replace(/<br />/);
		// 分割
		var preTableTexts = [];
		var partTexts = text.split('[--]');
		for (var i in partTexts) {
			var str = partTexts[i].replace(/<[^>]+?>/gmi, '');
			var matches = str.match(/[\n]+[^\n]+?[\n]+/gmi);
			if (matches !== null) {
				preTableTexts[i] = str.replace(/[\n]+/gmi, '');
			} else {
				preTableTexts[i] = null;
			}
		}
		
		//console.info(partTexts);
		//console.info(preTableTexts);
		
		return preTableTexts;
	}
	 
}