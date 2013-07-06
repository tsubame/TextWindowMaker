/**
 * HTMLファイルの台本を読み込むモジュール
 * 
 * 役割を小さくしたい
 * 　・HtmlのBodyの部分だけ抜き出す
 * 　・テーブルはテキスト形式に変換
 */
function HtmlParser() {

	// 区切りに使う罫線
	this.DIVIDE_LINE = "･･････････････････････････････････････････"
	
	// 元のHTML
	//this.orgHtml = orgHtml;

	/**
	 * 処理実行
	 * 
	 * HTMLからテキストに変換して返す
	 * 
	 * @return String script
	 */
	this.exec = function(html) {	
		var text = '';
		// bodyタグ内のHTMLを取得
		var body = this._pickupBody(html);
		// preタグが有ればpreタグの内側を抜き出す
		var hasPreTag = this._hasPreTag(body);
		if (hasPreTag === true) {
			text = body.replace(/<(\/)*pre>/gmi, '');
		// なければHTMLをテキストに変換
		} else {
			text = this._convertHtmlToText(body);
		}

		return text;
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
	 * ・HRを点線（this.DIVIDE_LINE）に
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
		
		// 先頭の空白を削除
		text = text.replace(/^[\s\n]+/m, '');
		text = text.replace(/^[ ]+/gmi, '');
		
		return text;
	}


	/**
	 * 改行タグを\nに変換
	 * ソースコード内の改行は削除する
	 * 
	 * <div> → \n
	 * <p> → \n
	 * <br /> → \n
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._convertTagsToLF = function(html) {
		var lfChar = '\n';
		// 元の改行コードを外す
		html = html.replace(/\n/gmi, '');
		
		html = html.replace(/[\s]*?<br[^>]*?>/gmi, lfChar);
		html = html.replace(/<p>/gmi, '');
		html = html.replace(/<p[\s]+[^>]*?>/gmi, '');
		html = html.replace(/<\/p[^>]*?>/gmi, lfChar);
		html = html.replace(/<div>/gmi, '');
		html = html.replace(/<div[\s]+[^>]*?>/gmi, '');
		html = html.replace(/(　| )*<\/div[^>]*?>/gmi,  lfChar);

		return html;
	}
	
	/**
	 * HTMLメタ文字の変換
	 * 
	 * @param  String html
	 * @return String cHtml
	 */
	this._convertMetaChar = function(html) {
		html = html.replace(/&amp;/g, '&');
		html = html.replace(/&quot;/g, '"');
		html = html.replace(/&#039;/g, "'");
		html = html.replace(/&lt;/g, '<');
		html = html.replace(/&gt;/g, '>');				
		html = html.replace(/&quot;/g, '"');
		html = html.replace(/&hellip;/g, '…');
		html = html.replace(/&rarr;/g, '→');
		html = html.replace(/&#12316;/gmi, '〜');
		html = html.replace(/&nbsp;/gmi, ' ');
		// 上記以外
		html = html.replace(/&[^;]+?;/gmi, '');
		
		return html;
	}
	
	/**
	 * HTMLタグを削除
	 * 
	 * @param  String html
	 * @return String html
	 */
	this._removeTags = function(html) {
		var html = html;
		html = html.replace(/<!\-\-[^\-]*?\-\->/gmi, '');
		// ulタグ
		html = html.replace(/<ul(.|\n)+?\/ul>/gmi, '');
		// liタグ
		html = html.replace(/<li(.|\n)+?\/li>/gmi, '');
		// h1~6タグ
		html = html.replace(/<h[1-6](.|\n)+?\/h[1-6]>/gmi, '');	
		// formタグ
		html = html.replace(/<form(.|\n)+?\/form>/gmi, '');	
		// aタグ
		html = html.replace(/<a[\s](.|\n)+?\/a>/gmi, '');	
		// subタグ
		html = html.replace(/<sub(.|\n)+?\/sub>/gmi, '');	
		// hrを置き換え
		html = html.replace(/<hr[^>]*>/gmi, this.DIVIDE_LINE);	
		// img
		html = html.replace(/<img[^>]*>/gmi, '');	
// 不要？
		// >>を】に
		html = html.replace(/>>/gmi, '】');
		// その他のタグ
		html = html.replace(/<[^>]+?>/gmi, '');	
		
		return html;
	}
}