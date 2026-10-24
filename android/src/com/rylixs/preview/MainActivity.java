package com.rylixs.preview;
import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import android.print.*;
import java.net.HttpURLConnection; import java.net.URL;
import java.io.*;
import java.security.*;
import android.util.Base64;
import org.json.JSONObject;
public class MainActivity extends Activity {
 boolean exchanging=false; WebView web; String base; ValueCallback<Uri[]> upload; LinearLayout root;
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(20,20,20));getWindow().setNavigationBarColor(Color.rgb(20,20,20));base=BuildConfig.SERVER_URL;root=new LinearLayout(this);root.setOrientation(1);root.setBackgroundColor(Color.rgb(20,20,20));root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(0,insets.getSystemWindowInsetTop(),0,insets.getSystemWindowInsetBottom());return insets;});LinearLayout bar=new LinearLayout(this);bar.setPadding(8,0,8,0);addButton(bar,"RYLIXS",()->web.loadUrl(base));addButton(bar,"Admin",()->web.loadUrl(base+"/admin"));if(!base.startsWith("https://"))addButton(bar,"Connect",()->configure());addButton(bar,"Print",()->{PrintManager pm=(PrintManager)getSystemService(PRINT_SERVICE);pm.print("RYLIXS invoice",web.createPrintDocumentAdapter("RYLIXS"),new PrintAttributes.Builder().build());});if(!base.startsWith("https://"))root.addView(bar);web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.getSettings().setBuiltInZoomControls(false);CookieManager.getInstance().setAcceptCookie(true);web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();Uri origin=Uri.parse(base);if(sameOrigin(u) && "/api/auth/google".equals(u.getPath())){beginGoogle(u);return true;}if(u.getScheme().equals(origin.getScheme())&&u.getHost()!=null&&u.getHost().equals(origin.getHost())&&u.getPort()==origin.getPort())return false;if(u.getScheme().equals("https")||u.getScheme().equals("mailto")||u.getScheme().equals("tel")){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){Toast.makeText(MainActivity.this,"No app available to open this link",Toast.LENGTH_LONG).show();}}return true;}@Override public void onReceivedError(WebView v,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())new AlertDialog.Builder(MainActivity.this).setTitle("Connecting to RYLIXS").setMessage(base.startsWith("https://")?"Check your internet connection. The store may take a moment to connect. Tap Retry to reconnect.":"Start RYLIXS on your laptop and run CONNECT_ANDROID.cmd, then tap Retry.").setPositiveButton("Retry",(d,w)->web.loadUrl(base)).setNegativeButton("Close",null).show();}});web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams params){if(upload!=null)upload.onReceiveValue(null);upload=cb;try{startActivityForResult(params.createIntent(),12);return true;}catch(Exception e){upload=null;return false;}}@Override public boolean onJsConfirm(WebView v,String url,String msg,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(msg).setPositiveButton("Confirm",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}});web.loadUrl(base);}
 void addButton(LinearLayout bar,String text,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(11);b.setTextColor(Color.rgb(215,184,123));b.setBackgroundColor(Color.TRANSPARENT);bar.addView(b,new LinearLayout.LayoutParams(0,48*getResources().getDisplayMetrics().densityDpi/160,1));b.setOnClickListener(v->action.run());}
 void configure(){EditText address=new EditText(this);address.setSingleLine();address.setInputType(17);address.setText(base);new AlertDialog.Builder(this).setTitle("Local test server").setMessage("USB: http://127.0.0.1:3100\nAndroid emulator: http://10.0.2.2:3100").setView(address).setPositiveButton("Connect",(d,w)->{String value=address.getText().toString().trim().replaceAll("/+$","");Uri u=Uri.parse(value);if(u.getHost()==null||!("http".equals(u.getScheme())||"https".equals(u.getScheme()))||u.getUserInfo()!=null){Toast.makeText(this,"Enter a valid HTTP(S) server address",Toast.LENGTH_LONG).show();return;}base=value;getPreferences(0).edit().putString("server",base).apply();web.loadUrl(base);}).setNegativeButton("Cancel",null).show();}
 boolean sameOrigin(Uri u){Uri origin=Uri.parse(base);return origin.getScheme().equals(u.getScheme())&&origin.getHost().equals(u.getHost())&&origin.getPort()==u.getPort();}
 void beginGoogle(Uri uri){
  try{
   byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
   String verifier=Base64.encodeToString(bytes,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);
   String challenge=Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes("UTF-8")),Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);
   getPreferences(0).edit().putString("oauth_verifier",verifier).putLong("oauth_started",System.currentTimeMillis()).commit();
   startActivity(new Intent(Intent.ACTION_VIEW,uri.buildUpon().appendQueryParameter("app_challenge",challenge).build()));
  }catch(Exception e){getPreferences(0).edit().remove("oauth_verifier").apply();Toast.makeText(this,"Please install a browser to sign in with Google.",Toast.LENGTH_LONG).show();}
 }
 @Override protected void onResume(){super.onResume();finishGoogle();}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);finishGoogle();}
 void finishGoogle(){
  if(web==null||exchanging)return;
  final String verifier=getPreferences(0).getString("oauth_verifier",null);
  if(verifier==null)return;
  if(System.currentTimeMillis()-getPreferences(0).getLong("oauth_started",0)>720000){getPreferences(0).edit().remove("oauth_verifier").apply();return;}
  exchanging=true;
  new Thread(()->{
   HttpURLConnection connection=null;
   try{
    connection=(HttpURLConnection)new URL(base+"/api/auth/google/app").openConnection();
    connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(20000);connection.setReadTimeout(20000);
    connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Origin",base);
    byte[] body=new JSONObject().put("verifier",verifier).toString().getBytes("UTF-8");
    try(OutputStream out=connection.getOutputStream()){out.write(body);}
    if(connection.getResponseCode()==200){
     String cookie=connection.getHeaderField("Set-Cookie");
     ByteArrayOutputStream buffer=new ByteArrayOutputStream();try(InputStream in=connection.getInputStream()){byte[] chunk=new byte[4096];int n;while((n=in.read(chunk))!=-1){buffer.write(chunk,0,n);if(buffer.size()>65536)throw new IOException("Response too large");}}
     String next=new JSONObject(buffer.toString("UTF-8")).optString("next","/account");
     final String destination=next.matches("^/(?!/)[A-Za-z0-9_/?=&%#-]*$")&&!next.startsWith("/admin")?next:"/account";
     if(cookie==null||!cookie.startsWith("rylixs_session="))throw new IOException("Missing session");
     final String sessionCookie=cookie;
     runOnUiThread(()->CookieManager.getInstance().setCookie(base,sessionCookie,accepted->{
      if(accepted){CookieManager.getInstance().flush();getPreferences(0).edit().remove("oauth_verifier").apply();web.loadUrl(base+destination);}else Toast.makeText(this,"Could not save sign-in. Please try again.",Toast.LENGTH_LONG).show();
     }));
    }
   }catch(Exception e){runOnUiThread(()->Toast.makeText(this,"Could not complete sign-in. Check your connection and return to the app to retry.",Toast.LENGTH_LONG).show());}
   finally{if(connection!=null)connection.disconnect();runOnUiThread(()->exchanging=false);}
  }).start();
 }
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==12&&upload!=null){upload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));upload=null;}}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();}
 @Override protected void onDestroy(){if(upload!=null)upload.onReceiveValue(null);web.destroy();super.onDestroy();}
}
